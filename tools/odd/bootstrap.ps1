#Requires -Version 7.0
[CmdletBinding()]
param([ValidateSet('Plan', 'Install', 'Verify')][string] $Mode = 'Plan')

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Read-ToolchainLock([string] $Path) {
    $lock = Get-Content -LiteralPath $Path -Raw | ConvertFrom-Json
    if ($lock.schemaVersion -ne 1 -or $lock.platform -ne 'windows-amd64') { throw 'Unsupported toolchain lock' }
    foreach ($tool in @($lock.go, $lock.engram, $lock.gentleAi)) {
        if ($tool.version -cnotmatch '^\d+\.\d+\.\d+$') { throw 'Invalid pinned version' }
    }
    $urls = @(
        "https://go.dev/dl/go$($lock.go.version).windows-amd64.zip",
        "https://github.com/Gentleman-Programming/engram/releases/download/v$($lock.engram.version)/engram_$($lock.engram.version)_windows_amd64.zip"
    )
    $artifacts = @($lock.go, $lock.engram)
    for ($i = 0; $i -lt $artifacts.Count; $i++) {
        if ($artifacts[$i].url -cne $urls[$i]) { throw 'Expected exact official HTTPS archive URL' }
        if ($artifacts[$i].sha256 -cnotmatch '^[a-f0-9]{64}$') { throw 'Invalid pinned SHA256' }
    }
    if ($lock.gentleAi.module -cne 'github.com/gentleman-programming/gentle-ai/v4' -or
        $lock.gentleAi.package -cne "$($lock.gentleAi.module)/cmd/gentle-ai" -or
        $lock.gentleAi.moduleSum -cnotmatch '^h1:[A-Za-z0-9+/]{43}=$' -or
        $lock.gentleAi.commit -cnotmatch '^[a-f0-9]{40}$') { throw 'Invalid official Gentle AI module pin' }
    return $lock
}

function Assert-ChildPath([string] $Root, [string] $Path) {
    $prefix = [IO.Path]::GetFullPath($Root).TrimEnd([IO.Path]::DirectorySeparatorChar) + [IO.Path]::DirectorySeparatorChar
    if (-not [IO.Path]::GetFullPath($Path).StartsWith($prefix, [StringComparison]::OrdinalIgnoreCase)) {
        throw "Path is outside toolchain root: $Path"
    }
}

function Assert-PlainPath([string] $Path) {
    $cursor = [IO.Path]::GetFullPath($Path)
    while ($cursor) {
        if (Test-Path -LiteralPath $cursor) {
            $item = Get-Item -LiteralPath $cursor -Force
            if ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) { throw "Reparse point is not an installation target: $cursor" }
        }
        $cursor = [IO.Path]::GetDirectoryName($cursor)
    }
}

function Assert-ArtifactHash([string] $Path, [string] $Expected) {
    Assert-PlainPath $Path
    $actual = (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash.ToLowerInvariant()
    if ($actual -cne $Expected) { throw "SHA256 mismatch: $Path" }
}

function Assert-ArchiveEntry([string] $Name, [string] $Destination, [int] $Attributes) {
    $normalized = $Name.Replace('\', '/')
    if ([string]::IsNullOrEmpty($normalized) -or $normalized -match '(^/|:|[\x00-\x1f]|(^|/)\.\.(/|$))') {
        throw "Unsafe archive entry: $Name"
    }
    if ((($Attributes -shr 16) -band 0xF000) -eq 0xA000) { throw "Archive symbolic link is unsupported: $Name" }
    Assert-ChildPath $Destination (Join-Path $Destination $normalized)
}

function Get-VerifiedArchive($Artifact, [string] $Downloads) {
    $file = Join-Path $Downloads ([Uri]$Artifact.url).Segments[-1]
    Assert-ChildPath $Downloads $file
    Assert-PlainPath $file
    if (-not (Test-Path -LiteralPath $file)) {
        $partial = "$file.$([Guid]::NewGuid().ToString('N')).partial"
        Write-Host "Downloading pinned archive: $($Artifact.url)"
        Invoke-WebRequest -Uri $Artifact.url -OutFile $partial -TimeoutSec 600
        Assert-ArtifactHash $partial $Artifact.sha256
        Move-Item -LiteralPath $partial -Destination $file
    }
    Assert-ArtifactHash $file $Artifact.sha256
    return $file
}

function Expand-VerifiedArchive([string] $Archive, [string] $Destination) {
    Assert-PlainPath $Destination
    $zip = [IO.Compression.ZipFile]::OpenRead($Archive)
    try {
        foreach ($entry in $zip.Entries) { Assert-ArchiveEntry $entry.FullName $Destination $entry.ExternalAttributes }
    } finally { $zip.Dispose() }
    [IO.Compression.ZipFile]::ExtractToDirectory($Archive, $Destination)
}

function Get-ToolPaths($Lock, [string] $Root) {
    return [ordered]@{
        root = $Root
        go = Join-Path $Root "go/$($Lock.go.version)/go/bin/go.exe"
        engram = Join-Path $Root "engram/$($Lock.engram.version)/engram.exe"
        gentleAi = Join-Path $Root "gentle-ai/$($Lock.gentleAi.version)/gentle-ai.exe"
    }
}

function Assert-ExtractedBinary($Artifact, [string] $Archive, [string] $EntryName, [string] $Binary) {
    Assert-ArtifactHash $Archive $Artifact.sha256
    $zip = [IO.Compression.ZipFile]::OpenRead($Archive)
    try {
        $entry = $zip.GetEntry($EntryName)
        if ($null -eq $entry) { throw "Official archive is missing $EntryName" }
        $stream = $entry.Open()
        $algorithm = [Security.Cryptography.SHA256]::Create()
        try { $expected = [Convert]::ToHexString($algorithm.ComputeHash($stream)).ToLowerInvariant() }
        finally { $stream.Dispose(); $algorithm.Dispose() }
        Assert-ArtifactHash $Binary $expected
    } finally { $zip.Dispose() }
}

function Test-InstalledTools($Lock, $Paths) {
    Invoke-PinnedGoEnvironment $Paths {
        foreach ($name in @('go', 'engram', 'gentleAi')) {
            Assert-PlainPath $Paths[$name]
            if (-not (Test-Path -LiteralPath $Paths[$name] -PathType Leaf)) { throw "Missing $name executable: $($Paths[$name])" }
        }
        foreach ($name in @('go', 'engram')) {
            $archive = Join-Path $Paths.root "downloads/$(([Uri]$Lock.$name.url).Segments[-1])"
            $entryName = if ($name -eq 'go') { 'go/bin/go.exe' } else { 'engram.exe' }
            Assert-ExtractedBinary $Lock.$name $archive $entryName $Paths[$name]
        }
        $goVersion = & $Paths.go version
        if ($LASTEXITCODE -ne 0 -or $goVersion -cne "go version go$($Lock.go.version) windows/amd64") { throw 'Unexpected Go version' }
        $engramVersion = & $Paths.engram version
        if ($LASTEXITCODE -ne 0 -or $engramVersion -notmatch "\b$([regex]::Escape($Lock.engram.version))\b") { throw 'Unexpected Engram version' }
        $moduleInfo = & $Paths.go version -m $Paths.gentleAi
        $moduleLine = "mod\s+$([regex]::Escape($Lock.gentleAi.module))\s+v$([regex]::Escape($Lock.gentleAi.version))\s+$([regex]::Escape($Lock.gentleAi.moduleSum))"
        if ($LASTEXITCODE -ne 0 -or ($moduleInfo -join "`n") -notmatch $moduleLine) { throw 'Gentle AI binary does not match the verified Go module pin' }
        $gentleVersion = & $Paths.gentleAi version
        if ($LASTEXITCODE -ne 0) { throw 'Gentle AI version probe failed' }
        return [ordered]@{
            go = $goVersion
            engram = $engramVersion
            gentleAi = $gentleVersion
            gentleAiModule = "v$($Lock.gentleAi.version) $($Lock.gentleAi.moduleSum)"
            binaries = @('go', 'engram', 'gentleAi') | ForEach-Object {
                [ordered]@{ tool = $_; path = $Paths[$_]; sha256 = (Get-FileHash -LiteralPath $Paths[$_] -Algorithm SHA256).Hash.ToLowerInvariant() }
            }
        }
    }
}

function Get-GoBuildEnvironment($Paths) {
    return @{
        GOBIN = Split-Path -Parent $Paths.gentleAi
        GOCACHE = Join-Path $Paths.root 'cache/build'; GOMODCACHE = Join-Path $Paths.root 'cache/modules'
        GOPATH = Join-Path $Paths.root 'cache/gopath'; GOTOOLCHAIN = 'local'; GOENV = 'off'; GOWORK = 'off'
        GOROOT = Split-Path -Parent (Split-Path -Parent $Paths.go)
        GOOS = 'windows'; GOARCH = 'amd64'
        GOPROXY = 'https://proxy.golang.org'; GOSUMDB = 'sum.golang.org'; GONOSUMDB = ''; GONOPROXY = ''; GOPRIVATE = ''; GOFLAGS = ''; CGO_ENABLED = '0'
    }
}

function Invoke-PinnedGoEnvironment($Paths, [scriptblock] $Action) {
    $environment = Get-GoBuildEnvironment $Paths
    foreach ($key in @('GOROOT', 'GOCACHE', 'GOMODCACHE', 'GOPATH')) { Assert-PlainPath $environment[$key] }
    $previous = @{}
    try {
        foreach ($key in $environment.Keys) {
            $previous[$key] = [Environment]::GetEnvironmentVariable($key, 'Process')
            [Environment]::SetEnvironmentVariable($key, $environment[$key], 'Process')
        }
        & $Action
    } finally {
        foreach ($key in $previous.Keys) { [Environment]::SetEnvironmentVariable($key, $previous[$key], 'Process') }
    }
}

function Install-Toolchain($Lock, $Paths) {
    $root = $Paths.root
    Assert-PlainPath $root
    [void][IO.Directory]::CreateDirectory($root)
    $guardPath = Join-Path $root 'bootstrap.lock'
    Assert-PlainPath $guardPath
    $guard = [IO.File]::Open($guardPath, 'OpenOrCreate', 'ReadWrite', 'None')
    try {
        $downloads = Join-Path $root 'downloads'
        Assert-PlainPath $downloads
        [void][IO.Directory]::CreateDirectory($downloads)
        foreach ($name in @('go', 'engram')) {
            $artifact = $Lock.$name
            $archive = Get-VerifiedArchive $artifact $downloads
            $destination = Join-Path $root "$name/$($artifact.version)"
            Assert-ChildPath $root $destination
            Assert-PlainPath $destination
            if (-not (Test-Path -LiteralPath $destination)) { Expand-VerifiedArchive $archive $destination }
            $entryName = if ($name -eq 'go') { 'go/bin/go.exe' } else { 'engram.exe' }
            Assert-ExtractedBinary $artifact $archive $entryName $Paths[$name]
        }
        $buildRoot = Join-Path $root "gentle-ai/$($Lock.gentleAi.version)"
        Assert-PlainPath $buildRoot
        [void][IO.Directory]::CreateDirectory($buildRoot)
        Invoke-PinnedGoEnvironment $Paths {
            if (-not (Test-Path -LiteralPath $Paths.gentleAi)) {
                $module = & $Paths.go mod download -json "$($Lock.gentleAi.module)@v$($Lock.gentleAi.version)"
                if ($LASTEXITCODE -ne 0) { throw 'Pinned Go module download failed' }
                $module = $module | ConvertFrom-Json
                if ($module.Sum -cne $Lock.gentleAi.moduleSum) { throw 'Gentle AI Go module checksum mismatch' }
                Write-Host "Building verified Go module $($Lock.gentleAi.package)@v$($Lock.gentleAi.version)"
                & $Paths.go install "$($Lock.gentleAi.package)@v$($Lock.gentleAi.version)"
                if ($LASTEXITCODE -ne 0) { throw 'Pinned Gentle AI build failed' }
            }
        }
        return Test-InstalledTools $Lock $Paths
    } finally { $guard.Dispose() }
}

function Invoke-ToolchainBootstrap([string] $SelectedMode) {
    $lock = Read-ToolchainLock (Join-Path $PSScriptRoot 'toolchain.lock.json')
    if (-not $IsWindows -or [Runtime.InteropServices.RuntimeInformation]::OSArchitecture -ne 'X64') { throw 'This bootstrap supports Windows x64 only' }
    if ([string]::IsNullOrWhiteSpace($env:LOCALAPPDATA)) { throw 'LOCALAPPDATA is required' }
    $root = Join-Path $env:LOCALAPPDATA 'POS-Platform/odd-toolchain'
    Assert-PlainPath $root
    $paths = Get-ToolPaths $lock $root
    switch ($SelectedMode) {
        'Plan' { [ordered]@{ mode = 'plan'; paths = $paths; versions = $lock; changesGlobalSettings = $false } | ConvertTo-Json -Depth 8 }
        'Verify' { Test-InstalledTools $lock $paths | ConvertTo-Json -Depth 8 }
        'Install' { Install-Toolchain $lock $paths | ConvertTo-Json -Depth 8 }
    }
}

if ($MyInvocation.InvocationName -ne '.') { Invoke-ToolchainBootstrap $Mode }

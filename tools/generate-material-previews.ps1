[CmdletBinding()]
param(
    [string]$Root = (Split-Path -Parent $PSScriptRoot),
    [string]$PdfInfo = (Get-Command pdfinfo.exe -ErrorAction Stop).Source
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem
$Root = (Resolve-Path -LiteralPath $Root).Path
$catalog = Get-Content -LiteralPath (Join-Path $Root 'portal/catalog.json') -Raw | ConvertFrom-Json
$needsWord = @($catalog.materials | Where-Object format -eq 'docx').Count -gt 0
$needsPowerPoint = @($catalog.materials | Where-Object format -eq 'pptx').Count -gt 0
if (($needsWord -or $needsPowerPoint) -and (Get-Process WINWORD, POWERPNT -ErrorAction SilentlyContinue)) {
    throw 'Run conversion when Word and PowerPoint are closed, so COM cannot reuse an interactive session.'
}
$output = Join-Path $Root 'materials/previews'
$staging = Join-Path $Root ('tmp/material-previews/' + [guid]::NewGuid().ToString('N'))
[void][IO.Directory]::CreateDirectory($staging)
[void][IO.Directory]::CreateDirectory($output)

function Release-ComObject($Object) {
    if ($null -ne $Object -and [Runtime.InteropServices.Marshal]::IsComObject($Object)) {
        [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($Object)
    }
}

function Assert-LocalSource([string]$Source) {
    $resolved = [IO.Path]::GetFullPath((Join-Path $Root $Source))
    if (-not $resolved.StartsWith($Root + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) {
        throw "Source escapes repository: $Source"
    }
    if (-not (Test-Path -LiteralPath $resolved -PathType Leaf)) { throw "Source does not exist: $Source" }
    if ([IO.Path]::GetExtension($resolved) -eq '.pdf') { return $resolved }
    # Office must not fetch linked content during generation. Ordinary hyperlinks
    # remain usable in the PDF but are never followed by this tool.
    $archive = [IO.Compression.ZipFile]::OpenRead($resolved)
    try {
        foreach ($entry in $archive.Entries) {
            if ($entry.FullName.EndsWith('.rels')) {
                $reader = [IO.StreamReader]::new($entry.Open())
                try { [xml]$relationships = $reader.ReadToEnd() } finally { $reader.Dispose() }
                foreach ($relationship in $relationships.DocumentElement.ChildNodes) {
                    if ($relationship.GetAttribute('TargetMode') -eq 'External' -and -not $relationship.GetAttribute('Type').EndsWith('/hyperlink')) {
                        throw "Linked external content requires review before conversion: $Source"
                    }
                }
            }
            if ($entry.FullName -match '^word/.*\.xml$') {
                $reader = [IO.StreamReader]::new($entry.Open())
                try { [xml]$wordPart = $reader.ReadToEnd() } finally { $reader.Dispose() }
                foreach ($instruction in $wordPart.SelectNodes('//*[local-name()="instrText"] | //*[local-name()="fldSimple"]/@*[local-name()="instr"]')) {
                    if ($instruction.InnerText -match '\b(?:DDEAUTO|DDE|INCLUDETEXT|INCLUDEPICTURE|DATABASE|LINK)\b') {
                        throw "Connected Word field requires review before conversion: $Source"
                    }
                }
            }
        }
    } finally { $archive.Dispose() }
    return $resolved
}

$documents = [Collections.Generic.List[object]]::new()
$word = $null
$powerpoint = $null
$wordOptions = @{}
$wordVersion = 'not used'
$powerpointVersion = 'not used'
$registeredFonts = [Collections.Generic.List[string]]::new()
try {
    if ($needsPowerPoint) {
        # COM is out of process, so FR_PRIVATE cannot reach Office. Register
        # fonts for this Windows session only, then remove them in finally.
        if (-not ('MaterialPreviewFontRegistry' -as [type])) { Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class MaterialPreviewFontRegistry {
 [DllImport("gdi32.dll", CharSet=CharSet.Unicode)] public static extern int AddFontResourceEx(string path,uint flags,IntPtr reserved);
 [DllImport("gdi32.dll", CharSet=CharSet.Unicode)] public static extern bool RemoveFontResourceEx(string path,uint flags,IntPtr reserved);
}
'@
        }
        Add-Type -AssemblyName System.Drawing
        $fontFiles = @()
        if (@($catalog.materials | Where-Object id -eq 'mountain-cash-ecosystem').Count -gt 0) {
            $fontFiles += @((Join-Path $Root 'materials/previews/fonts/Rubik-Regular.ttf'), (Join-Path $Root 'materials/previews/fonts/Rubik-Bold.ttf'))
            $installedFonts = [Drawing.Text.InstalledFontCollection]::new()
            try { $plexInstalled = 'IBM Plex Sans' -in @($installedFonts.Families | ForEach-Object Name) } finally { $installedFonts.Dispose() }
            if (-not $plexInstalled) {
                $plexFonts = @(Get-ChildItem -Path (Join-Path $env:LOCALAPPDATA 'Microsoft/FontCache/*/CloudFonts/IBM Plex Sans/*.ttf') -ErrorAction SilentlyContinue)
                if ($plexFonts.Count -eq 0) { throw 'Mountain requires IBM Plex Sans installed or available in the local Office font cache.' }
                $fontFiles += $plexFonts.FullName
            }
        }
        foreach ($fontFile in $fontFiles) {
            if (-not (Test-Path -LiteralPath $fontFile -PathType Leaf)) { throw "Required font file missing: $fontFile" }
            if ([MaterialPreviewFontRegistry]::AddFontResourceEx($fontFile, 0, [IntPtr]::Zero) -eq 0) { throw "Cannot register required font: $fontFile" }
            $registeredFonts.Add($fontFile)
        }
        $availableFonts = [Drawing.Text.InstalledFontCollection]::new()
        try {
            $availableFamilies = @($availableFonts.Families | ForEach-Object Name)
            foreach ($material in @($catalog.materials | Where-Object format -eq 'pptx')) {
                $fontArchive = [IO.Compression.ZipFile]::OpenRead((Assert-LocalSource $material.source))
                try {
                    $requestedFamilies = [Collections.Generic.HashSet[string]]::new()
                    foreach ($entry in $fontArchive.Entries) {
                        if ($entry.FullName -match '^ppt/slides/slide\d+\.xml$') {
                            $reader = [IO.StreamReader]::new($entry.Open())
                            try { [xml]$slideXml = $reader.ReadToEnd() } finally { $reader.Dispose() }
                            foreach ($font in $slideXml.SelectNodes('//*[local-name()="r"]/*[local-name()="rPr"]/*[local-name()="latin"]')) {
                                $family = $font.GetAttribute('typeface')
                                if ($family -and -not $family.StartsWith('+')) { [void]$requestedFamilies.Add($family) }
                            }
                        }
                    }
                    foreach ($family in $requestedFamilies) {
                        if ($family -notin $availableFamilies) {
                            if ($material.id -eq 'mountain-cash-ecosystem' -and $family -in @('Acumin Variable Concept', 'Acumin Variable Concept Black I')) {
                                Write-Warning 'Mountain contains licensed Acumin branding text unavailable locally. Its native Office substitution is retained and documented in materials/previews/quality-review.md.'
                            } else { throw "Requested font unavailable for $($material.id): $family" }
                        }
                    }
                } finally { $fontArchive.Dispose() }
            }
        } finally { $availableFonts.Dispose() }
    }
    # Dedicated instances only: never attach to or close a user's documents.
    if ($needsWord) {
        $word = New-Object -ComObject Word.Application
        $word.Visible = $false
        $word.DisplayAlerts = 0
        $word.AutomationSecurity = 3
        foreach ($option in @('UpdateLinksAtOpen', 'UpdateFieldsAtPrint', 'UpdateLinksAtPrint')) {
            $wordOptions[$option] = $word.Options.$option
            $word.Options.$option = $false
        }
        $wordVersion = (Get-Item -LiteralPath (Join-Path $word.Path 'WINWORD.EXE')).VersionInfo.ProductVersion
    }
    if ($needsPowerPoint) {
        $powerpoint = New-Object -ComObject PowerPoint.Application
        $powerpoint.AutomationSecurity = 3
        $powerpoint.DisplayAlerts = 1
        $powerpointVersion = (Get-Item -LiteralPath (Join-Path $powerpoint.Path 'POWERPNT.EXE')).VersionInfo.ProductVersion
    }

    foreach ($material in $catalog.materials) {
        if ($material.format -notin @('docx', 'pptx', 'pdf')) { throw "Unsupported material format: $($material.id)" }
        if ($material.id -notmatch '^[a-z0-9]+(?:-[a-z0-9]+)*$') { throw "Unsafe material ID: $($material.id)" }
        $source = Assert-LocalSource $material.source
        $sourceHash = (Get-FileHash -LiteralPath $source -Algorithm SHA256).Hash.ToLowerInvariant()
        $pdf = Join-Path $staging ($material.id + '.pdf')
        $document = $null
        $expectedPages = 0
        try {
            if ($material.format -eq 'docx') {
                # ConfirmConversions=false, ReadOnly=true, AddToRecentFiles=false.
                $document = $word.Documents.Open($source, $false, $true, $false)
                $document.Repaginate()
                $expectedPages = $document.ComputeStatistics(2)
                # PDF, print quality, all pages, document without markup, no
                # document properties, retain labels, bookmarks, tagged text,
                # no bitmap replacement of text, no PDF/A flattening.
                $document.ExportAsFixedFormat($pdf, 17, $false, 0, 0, 1, 1, 0, $false, $true, 1, $true, $false, $false)
            } elseif ($material.format -eq 'pptx') {
                # ReadOnly=true, Untitled=false, WithWindow=false.
                $document = $powerpoint.Presentations.Open($source, -1, 0, 0)
                $expectedPages = $document.Slides.Count
                # All slides, including any hidden ones; no notes pages or
                # animation builds. No metadata, preserve tags and text glyphs.
                $printRange = $document.PrintOptions.Ranges.Add(1, $expectedPages)
                try {
                    $document.ExportAsFixedFormat($pdf, 2, 2, 0, 1, 1, -1, $printRange, 1, '', $false, $true, $true, $false, $false)
                } finally { Release-ComObject $printRange }
            } else {
                # Existing PDF materials are already fixed-layout originals.
                Copy-Item -LiteralPath $source -Destination $pdf
            }
        } finally {
            if ($null -ne $document) {
                if ($material.format -eq 'docx') { $document.Close(0) } else { $document.Close() }
                Release-ComObject $document
            }
        }
        if ((Get-FileHash -LiteralPath $source -Algorithm SHA256).Hash.ToLowerInvariant() -ne $sourceHash) {
            throw "Original changed during conversion: $($material.source)"
        }
        if (-not (Test-Path -LiteralPath $pdf -PathType Leaf)) { throw "Office did not produce a PDF: $($material.id)" }
        $info = & $PdfInfo $pdf 2>&1
        if ($LASTEXITCODE -ne 0) { throw "pdfinfo failed for $($material.id): $info" }
        $pageMatch = [regex]::Match(($info -join "`n"), '(?m)^Pages:\s+(\d+)\s*$')
        if (-not $pageMatch.Success) { throw "Missing PDF page count: $($material.id)" }
        $pages = [int]$pageMatch.Groups[1].Value
        if ($pages -lt 1) { throw "PDF has no pages: $($material.id)" }
        if ($expectedPages -gt 0 -and $pages -ne $expectedPages) { throw "Page mismatch for $($material.id): Office=$expectedPages PDF=$pages" }
        $documents.Add([ordered]@{
            id = $material.id
            sourceSha256 = $sourceHash
            pdf = 'materials/previews/' + $material.id + '.pdf'
            pdfSha256 = (Get-FileHash -LiteralPath $pdf -Algorithm SHA256).Hash.ToLowerInvariant()
            pages = $pages
        })
        Write-Host "$($material.id): $pages pages; original hash unchanged"
    }
} finally {
    try {
        if ($null -ne $word) {
            try {
                foreach ($option in $wordOptions.Keys) { $word.Options.$option = $wordOptions[$option] }
            } finally {
                try { $word.Quit(0) } finally { Release-ComObject $word }
            }
        }
    } finally {
        try {
            if ($null -ne $powerpoint) {
                try { $powerpoint.Quit() } finally { Release-ComObject $powerpoint }
            }
        } finally {
            foreach ($fontFile in $registeredFonts) { [void][MaterialPreviewFontRegistry]::RemoveFontResourceEx($fontFile, 0, [IntPtr]::Zero) }
            [GC]::Collect()
            [GC]::WaitForPendingFinalizers()
        }
    }
}

# Replace published previews only after every export and source check succeeds.
foreach ($document in $documents) {
    $name = $document.id + '.pdf'
    Copy-Item -LiteralPath (Join-Path $staging $name) -Destination (Join-Path $output $name) -Force
}
$manifest = [ordered]@{
    schemaVersion = 1
    generator = [ordered]@{
        name = 'Microsoft Office ExportAsFixedFormat'
        version = "Word $wordVersion; PowerPoint $powerpointVersion; generator 1.0.0"
    }
    documents = @($documents)
}
[IO.File]::WriteAllText((Join-Path $output 'manifest.json'), ($manifest | ConvertTo-Json -Depth 8) + "`n", [Text.UTF8Encoding]::new($false))
Write-Host "Generated $($documents.Count) previews. Render and inspect every page before publication."

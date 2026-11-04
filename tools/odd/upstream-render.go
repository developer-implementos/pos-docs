// POS invokes the pinned upstream renderers; this file does not replace their logic.
package main

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"

	"github.com/gentleman-programming/gentle-ai/v4/internal/assets"
	"github.com/gentleman-programming/gentle-ai/v4/internal/components/agentguidance"
	"github.com/gentleman-programming/gentle-ai/v4/internal/components/filemerge"
	"github.com/gentleman-programming/gentle-ai/v4/internal/components/reviewassets"
	"github.com/gentleman-programming/gentle-ai/v4/internal/model"
)

func main() {
	if len(os.Args) != 3 || !filepath.IsAbs(os.Args[1]) || !filepath.IsAbs(os.Args[2]) {
		panic("absolute output directory and profile file required")
	}
	output := os.Args[1]
	var profile struct {
		Models  map[string]string            `json:"codexModels"`
		Efforts map[string]model.CodexEffort `json:"codexEfforts"`
	}
	bytes, err := os.ReadFile(os.Args[2])
	if err != nil {
		panic(err)
	}
	if err := json.Unmarshal(bytes, &profile); err != nil {
		panic(err)
	}
	for _, role := range []string{"odd-explorer", "odd-worker", "odd-verify"} {
		if profile.Models[role] == "" || !profile.Efforts[role].Valid() {
			panic("complete official model/effort assignments required")
		}
	}
	for _, agent := range []model.AgentID{model.AgentCodex, model.AgentClaudeCode} {
		result, err := agentguidance.InjectRoutingWithOptions(output, agent, agentguidance.RoutingOptions{
			ReviewContract:             reviewassets.ReviewExecutionContractFor,
			CodexPhaseModelAssignments: profile.Models,
			CodexModelAssignments:      profile.Efforts,
		})
		if err != nil {
			panic(err)
		}
		fmt.Println(result.Files)
	}
	protocol := filemerge.ExtractHTMLCommentSection(assets.MustRead("engram/protocol.md"), "full")
	if err := os.WriteFile(filepath.Join(output, "engram.md"), []byte(protocol), 0600); err != nil {
		panic(err)
	}
}

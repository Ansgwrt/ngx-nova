package service

import (
	"fmt"
	"strings"
)

const (
	acmeScriptURL  = "https://raw.githubusercontent.com/woniu336/open_shell/main/nginx-acme.sh"
	acmeScriptPath = "/root/nginx-acme.sh"
)

func buildAcmeScriptCommand(inputs []string) string {
	var builder strings.Builder
	builder.WriteString(fmt.Sprintf("set -euo pipefail; curl -fsSL %s -o %s && chmod +x %s && cat <<'EOF' | bash %s\n",
		acmeScriptURL, acmeScriptPath, acmeScriptPath, acmeScriptPath))
	for _, line := range inputs {
		builder.WriteString(line)
		builder.WriteString("\n")
	}
	builder.WriteString("EOF\n")
	return builder.String()
}

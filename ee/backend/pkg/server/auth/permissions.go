package auth

import "strings"

func getPermissions(urlPath string) []string {
	res := []string{"SPOT"}
	if strings.Contains(urlPath, "public-key") {
		res = append(res, "SPOT_PUBLIC")
	}
	return res
}

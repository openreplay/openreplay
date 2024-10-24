//package service
//
//import (
//	"encoding/json"
//	"fmt"
//	"github.com/gorilla/mux"
//	"net/http"
//)
//
//type CreateDashboardSchema struct {
//	DashboardID int    `json:"dashboard_id"`
//	Name        string `json:"name"`
//	Description string `json:"description"`
//	IsPublic    bool   `json:"is_public"`
//	IsPinned    bool   `json:"is_pinned"`
//	Metrics     []int  `json:"metrics"`
//}
//
//type CurrentContext struct {
//	UserID int `json:"user_id"`
//}
//
//func (e *Router) createDashboard(w http.ResponseWriter, r *http.Request) {
//	vars := mux.Vars(r)
//	projectId := vars["projectId"]
//	fmt.Printf("Received projectId: %s\n", projectId)
//
//	var data CreateDashboardSchema
//	if err := json.NewDecoder(r.Body).Decode(&data); err != nil {
//		http.Error(w, "Invalid request payload", http.StatusBadRequest)
//		return
//	}
//
//	context := e.getCurrentContext(r)
//	if context == nil {
//		http.Error(w, "Unauthorized", http.StatusUnauthorized)
//		return
//	}
//
//	data.DashboardID = 1 // Placeholder for dashboard ID generation logic
//
//	w.Header().Set("Content-Type", "application/json")
//	json.NewEncoder(w).Encode(data)
//}

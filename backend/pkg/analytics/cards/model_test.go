package cards

import (
	"encoding/json"
	"testing"

	"openreplay/backend/pkg/analytics/model"
)

func TestCardInfoLoadsLegacyStringBreakdowns(t *testing.T) {
	raw := []byte(`{"rows":null,"breakdowns":["userCountry","currentPath"]}`)
	var info CardInfo
	if err := json.Unmarshal(raw, &info); err != nil {
		t.Fatalf("unmarshal legacy card_info: %v", err)
	}
	if len(info.Breakdowns) != 2 {
		t.Fatalf("got %d breakdowns, want 2", len(info.Breakdowns))
	}
	want := []model.Breakdown{{Name: "userCountry"}, {Name: "currentPath"}}
	for i := range want {
		if info.Breakdowns[i] != want[i] {
			t.Errorf("breakdowns[%d] = %+v, want %+v", i, info.Breakdowns[i], want[i])
		}
	}
}

func TestCardInfoSavesObjectBreakdowns(t *testing.T) {
	info := CardInfo{Breakdowns: []model.Breakdown{{Name: "planType", IsEvent: true, DataType: "string"}}}
	data, err := json.Marshal(info)
	if err != nil {
		t.Fatalf("marshal card_info: %v", err)
	}
	var back CardInfo
	if err := json.Unmarshal(data, &back); err != nil {
		t.Fatalf("unmarshal card_info: %v", err)
	}
	if len(back.Breakdowns) != 1 || back.Breakdowns[0] != info.Breakdowns[0] {
		t.Fatalf("round trip changed breakdowns: %+v", back.Breakdowns)
	}
	var shape struct {
		Breakdowns []map[string]any `json:"breakdowns"`
	}
	if err := json.Unmarshal(data, &shape); err != nil {
		t.Fatalf("unmarshal shape: %v", err)
	}
	for _, key := range []string{"name", "isEvent", "autoCaptured", "dataType"} {
		if _, ok := shape.Breakdowns[0][key]; !ok {
			t.Errorf("serialized breakdown missing key %q", key)
		}
	}
}

func TestCardBreakdownValidation(t *testing.T) {
	tests := []struct {
		name       string
		breakdowns []model.Breakdown
		wantErr    bool
	}{
		{"empty", nil, false},
		{"three", []model.Breakdown{{Name: "a"}, {Name: "b"}, {Name: "c"}}, false},
		{"four", []model.Breakdown{{Name: "a"}, {Name: "b"}, {Name: "c"}, {Name: "d"}}, true},
		{"duplicate name", []model.Breakdown{{Name: "a"}, {Name: "a", IsEvent: true}}, true},
		{"empty name", []model.Breakdown{{Name: ""}}, true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := GetValidator().Struct(CardInfo{Breakdowns: tt.breakdowns})
			if (err != nil) != tt.wantErr {
				t.Errorf("validation error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

type fakeRow struct{ info []byte }

func (f fakeRow) Scan(dest ...interface{}) error {
	for _, d := range dest {
		if raw, ok := d.(*[]byte); ok {
			*raw = f.info
		}
	}
	return nil
}

func TestScanCardLoadsLegacyStringBreakdowns(t *testing.T) {
	s := &cardsImpl{}
	card, err := s.scanCard(fakeRow{info: []byte(`{"breakdowns":["userCountry","currentPath"]}`)})
	if err != nil {
		t.Fatalf("scanCard: %v", err)
	}
	if len(card.Breakdowns) != 2 || card.Breakdowns[0].Name != "userCountry" || card.Breakdowns[1].Name != "currentPath" {
		t.Fatalf("got %+v", card.Breakdowns)
	}
	if card.Breakdowns[0].IsEvent || card.Breakdowns[0].AutoCaptured || card.Breakdowns[0].DataType != "" {
		t.Errorf("legacy breakdown enriched unexpectedly: %+v", card.Breakdowns[0])
	}
}

func TestScanCardLoadsObjectBreakdowns(t *testing.T) {
	s := &cardsImpl{}
	raw := `{"breakdowns":[{"name":"planType","isEvent":true,"autoCaptured":false,"dataType":"string"}]}`
	card, err := s.scanCard(fakeRow{info: []byte(raw)})
	if err != nil {
		t.Fatalf("scanCard: %v", err)
	}
	want := model.Breakdown{Name: "planType", IsEvent: true, DataType: "string"}
	if len(card.Breakdowns) != 1 || card.Breakdowns[0] != want {
		t.Fatalf("got %+v, want %+v", card.Breakdowns, want)
	}
}

func TestCardInfoKeepsLegacyStringShapeOnSave(t *testing.T) {
	data, err := json.Marshal(CardInfo{Breakdowns: []model.Breakdown{{Name: "userCountry"}}})
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}
	var shape struct {
		Breakdowns []any `json:"breakdowns"`
	}
	if err := json.Unmarshal(data, &shape); err != nil {
		t.Fatalf("unmarshal shape: %v", err)
	}
	if got, ok := shape.Breakdowns[0].(string); !ok || got != "userCountry" {
		t.Errorf("plain breakdown serialized as %#v, want the bare string", shape.Breakdowns[0])
	}
}

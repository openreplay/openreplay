package filters

import (
	"fmt"
	"strconv"
	"strings"

	"github.com/ClickHouse/clickhouse-go/v2"
)

// Params collects the values for named query parameters generated while
// building conditions. The SQL text only carries "@pN" placeholders (plus
// explicitly Set names like "@projectId"); the values are bound when the
// query is executed.
type Params struct {
	values map[string]any
	names  map[string]string // value fingerprint -> assigned parameter name
}

func NewParams() *Params {
	return &Params{
		values: make(map[string]any),
		names:  make(map[string]string),
	}
}

func paramFingerprint(v any) string {
	switch s := v.(type) {
	case []string:
		return "[]string\x00" + strings.Join(s, "\x00")
	case clickhouse.GroupSet:
		parts := make([]string, len(s.Value)+1)
		parts[0] = "GroupSet"
		for i, e := range s.Value {
			parts[i+1] = fmt.Sprintf("%T:%v", e, e)
		}
		return strings.Join(parts, "\x00")
	}
	return fmt.Sprintf("%T\x00%v", v, v)
}

// Add registers v as a query parameter and returns its "@pN" placeholder.
// Equal values reuse the same parameter, so identical filters keep producing
// identical condition strings (condition deduplication relies on that).
func (p *Params) Add(v any) string {
	fp := paramFingerprint(v)
	if name, ok := p.names[fp]; ok {
		return "@" + name
	}
	name := "p" + strconv.Itoa(len(p.names)+1)
	p.names[fp] = name
	p.values[name] = v
	return "@" + name
}

// Set binds v under an explicit parameter name (e.g. "projectId").
func (p *Params) Set(name string, v any) {
	p.values[name] = v
}

// Values returns the accumulated name -> value bindings.
func (p *Params) Values() map[string]any {
	return p.values
}

// Args converts the accumulated bindings into clickhouse driver arguments.
func (p *Params) Args() []interface{} {
	args := make([]interface{}, 0, len(p.values))
	for k, v := range p.values {
		args = append(args, clickhouse.Named(k, v))
	}
	return args
}

// GroupSetOf wraps values in a clickhouse.GroupSet, which binds as a
// parenthesized tuple "(v1, v2, ...)" — the right-hand side of IN / NOT IN.
func GroupSetOf(values []string) clickhouse.GroupSet {
	vals := make([]any, len(values))
	for i, v := range values {
		vals[i] = v
	}
	return clickhouse.GroupSet{Value: vals}
}

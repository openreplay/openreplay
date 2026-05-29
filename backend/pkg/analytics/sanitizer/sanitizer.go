package sanitizer

import (
	"html"
	"reflect"
)

func EscapeStructStrings(v interface{}) {
	val := reflect.ValueOf(v)
	if val.Kind() != reflect.Ptr || val.IsNil() {
		return
	}
	elem := val.Elem()
	if elem.Kind() != reflect.Struct {
		return
	}
	for i := 0; i < elem.NumField(); i++ {
		field := elem.Field(i)
		switch field.Kind() {
		case reflect.String:
			if field.CanSet() {
				field.SetString(html.EscapeString(field.String()))
			}
		case reflect.Ptr:
			if !field.IsNil() && field.Elem().Kind() == reflect.String && field.Elem().CanSet() {
				field.Elem().SetString(html.EscapeString(field.Elem().String()))
			}
		case reflect.Slice:
			if field.Type().Elem().Kind() == reflect.String {
				for j := 0; j < field.Len(); j++ {
					field.Index(j).SetString(html.EscapeString(field.Index(j).String()))
				}
			}
		}
	}
}

func EscapePropertyMap(props *map[string]interface{}) {
	if props == nil || *props == nil {
		return
	}
	escaped := make(map[string]interface{}, len(*props))
	for k, val := range *props {
		escaped[html.EscapeString(k)] = EscapePropertyValue(val)
	}
	*props = escaped
}

func EscapePropertyValue(val interface{}) interface{} {
	switch v := val.(type) {
	case string:
		return html.EscapeString(v)
	case map[string]interface{}:
		escaped := make(map[string]interface{}, len(v))
		for k, vv := range v {
			escaped[html.EscapeString(k)] = EscapePropertyValue(vv)
		}
		return escaped
	case []interface{}:
		for i, vv := range v {
			v[i] = EscapePropertyValue(vv)
		}
		return v
	default:
		return val
	}
}

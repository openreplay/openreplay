package filters

import (
	"sync"

	"github.com/go-playground/validator/v10"
)

var (
	sharedValidator *validator.Validate
	validatorOnce   sync.Once
)

func GetSharedValidator() *validator.Validate {
	validatorOnce.Do(func() {
		sharedValidator = validator.New()
		sharedValidator.RegisterStructValidation(ValidateFilterFields, Filter{})
	})
	return sharedValidator
}

func ValidateStruct(obj interface{}) error {
	return GetSharedValidator().Struct(obj)
}

func RegisterCustomValidation(tag string, fn validator.Func) error {
	return GetSharedValidator().RegisterValidation(tag, fn)
}

func ValidateEventColumn(fl validator.FieldLevel) bool {
	column := fl.Field().String()
	if column == "" {
		return true
	}
	for _, validCol := range EventColumns {
		if column == string(validCol) {
			return true
		}
	}
	return false
}

func ValidateUserColumn(fl validator.FieldLevel) bool {
	column := fl.Field().String()
	if column == "" {
		return true
	}
	for _, validCol := range UserColumns {
		if column == string(validCol) {
			return true
		}
	}
	return false
}
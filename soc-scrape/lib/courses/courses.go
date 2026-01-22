package courses

type Department struct {
	Code      string `json:"code"`
	Expansion string `json:"value"`
}

type CourseRequirementOR struct {
	Codes []string
}

func (or *CourseRequirementOR) satisfies() {}

type CourseRequirementAND struct {
	Codes []string
}

func (and *CourseRequirementAND) satisfies() {}

type Course struct {
	Department   Department
	Requirements []CourseRequirement // nil if no requirements
}

type CourseRequirement interface {
	satisfies()
}

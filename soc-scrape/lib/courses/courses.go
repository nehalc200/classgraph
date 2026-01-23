package courses

type Department struct {
	Code      string `json:"code"`
	Expansion string `json:"value"`
}


type Course struct {
	Department   string
	Numerical    string
	Requirements []string
}



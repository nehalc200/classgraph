package lib

type InsLogical string
type ScheduleDay string
type SearchTab string

const (
	InsBegin   InsLogical = "begin"
	InsContain InsLogical = "contain"
	InsExact   InsLogical = "exact"

	DayMonday    ScheduleDay = "M"
	DayTuesday   ScheduleDay = "T"
	DayWednesday ScheduleDay = "W"
	DayThursday  ScheduleDay = "R"
	DayFriday    ScheduleDay = "F"
	DaySaturday  ScheduleDay = "S"

	TabSubject  SearchTab = "tabs-sub"
	TabDept     SearchTab = "tabs-dept"
	TabCourse   SearchTab = "tabs-crs"
	TabSections SearchTab = "tabs-sec"
	TabInst     SearchTab = "tabs-ins"
)

func NewSearchRequest(term string, tabNum SearchTab) *SearchRequestForm {
	return &SearchRequestForm{
		selectedTerm:         term,
		tabNum:               tabNum,
		_selectedSubjects:    1,
		_selectedDepartments: 1,
		_hideFullSec:         "on",
		hideFullSec:          false,
		_showPopup:           "on",
		showPopup:            false,
		loggedIn:             false,

		_schedOption1:  "on",                                         // default value "on" DO NOT CHANGE
		_schedOption2:  "on",                                         // default value "on" DO NOT CHANGE
		_schedOption3:  "on",                                         // default value "on" DO NOT CHANGE
		_schedOption4:  "on",                                         // default value "on" DO NOT CHANGE
		_schedOption5:  "on",                                         // default value "on" DO NOT CHANGE
		_schedOption7:  "on",                                         // default value "on" DO NOT CHANGE
		_schedOption8:  "on",                                         // default value "on" DO NOT CHANGE
		_schedOption9:  "on",                                         // default value "on" DO NOT CHANGE
		_schedOption10: "on",                                         // default value "on" DO NOT CHANGE
		_schedOption11: "on",                                         // default value "on" DO NOT CHANGE
		_schedOption12: "on",                                         // default value "on" DO NOT CHANGE
		_schedOption13: "on",                                         // default value "on" DO NOT CHANGE
		_schDay:        []string{"on", "on", "on", "on", "on", "on"}, // values only contain "on" size = 6

		schedOption1:  true, // Lower Division 1-99
		schedOption11: true, // Lower Division 87&90s
		schedOption12: true, // Lower Division 99s
		schedOption2:  true, // Upper Division 100-198
		schedOption4:  true, // Upper Division 195s
		schedOption5:  true, // Upper Division 199s
		schedOption3:  true, // Graduate 200-297
		schedOption7:  true, // Graduate 298s
		schedOption8:  true, // Graduate 299s
		schedOption13: true, // Graduate 300+
		schedOption10: true, // Graduate 400+
		schedOption9:  true, // Graduate 500+
		schStartTime:  "12:00",
		schStartAmPm:  0,
		schEndTime:    "12:00",
		schEndAmPm:    0,
		schDay:        []ScheduleDay{DayMonday, DayTuesday, DayWednesday, DayThursday, DayFriday, DaySaturday},

		_schedOptionDept1:  "on",                                         // default value "on" DO NOT CHANGE
		_schedOptionDept2:  "on",                                         // default value "on" DO NOT CHANGE
		_schedOptionDept3:  "on",                                         // default value "on" DO NOT CHANGE
		_schedOptionDept4:  "on",                                         // default value "on" DO NOT CHANGE
		_schedOptionDept5:  "on",                                         // default value "on" DO NOT CHANGE
		_schedOptionDept7:  "on",                                         // default value "on" DO NOT CHANGE
		_schedOptionDept8:  "on",                                         // default value "on" DO NOT CHANGE
		_schedOptionDept9:  "on",                                         // default value "on" DO NOT CHANGE
		_schedOptionDept10: "on",                                         // default value "on" DO NOT CHANGE
		_schedOptionDept11: "on",                                         // default value "on" DO NOT CHANGE
		_schedOptionDept12: "on",                                         // default value "on" DO NOT CHANGE
		_schedOptionDept13: "on",                                         // default value "on" DO NOT CHANGE
		_schDayDept:        []string{"on", "on", "on", "on", "on", "on"}, // values only contain "on" size = 6

		schedOptionDept1:  true, // Lower Division 1-99
		schedOptionDept11: true, // Lower Division 87&90s
		schedOptionDept12: true, // Lower Division 99s
		schedOptionDept2:  true, // Upper Division 100-198
		schedOptionDept4:  true, // Upper Division 195s
		schedOptionDept5:  true, // Upper Division 199s
		schedOptionDept3:  true, // Graduate 200-297
		schedOptionDept7:  true, // Graduate 298s
		schedOptionDept8:  true, // Graduate 299s
		schedOptionDept13: true, // Graduate 300+
		schedOptionDept10: true, // Graduate 400+
		schedOptionDept9:  true, // Graduate 500+
		schStartTimeDept:  "12:00",
		schStartAmPmDept:  0,
		schEndTimeDept:    "12:00",
		schEndAmPmDept:    0,
		schDayDept:        []ScheduleDay{DayMonday, DayTuesday, DayWednesday, DayThursday, DayFriday, DaySaturday},
	}
}

/* This will both add a subject and a department. Multiple Can be added at a time*/
func (sr *SearchRequestForm) AddDepartment(code ...string) {
	sr.selectedDepartments = append(sr.selectedDepartments, code...)
	sr.selectedSubjects = append(sr.selectedSubjects, code...)
}

/*
Mostly documented form post parameters for Schedule of Classes
896 bytes
*/
type SearchRequestForm struct {
	selectedTerm string // Term ID
	xsoc_term    string // no documentation
	loggedIn     bool   // for the love of god please set this to false

	tabNum SearchTab // "tabs-sub" specific tab ("by subject", "by department", "by code(s)", and so on)

	// tabNum = "tabs-sub"
	selectedSubjects  []string
	_selectedSubjects uint8 // default value 1

	// THERE IS NO _schedOption6
	_schedOption1  string // default value "on" DO NOT CHANGE
	_schedOption2  string // default value "on" DO NOT CHANGE
	_schedOption3  string // default value "on" DO NOT CHANGE
	_schedOption4  string // default value "on" DO NOT CHANGE
	_schedOption5  string // default value "on" DO NOT CHANGE
	_schedOption7  string // default value "on" DO NOT CHANGE
	_schedOption8  string // default value "on" DO NOT CHANGE
	_schedOption9  string // default value "on" DO NOT CHANGE
	_schedOption10 string // default value "on" DO NOT CHANGE
	_schedOption11 string // default value "on" DO NOT CHANGE
	_schedOption12 string // default value "on" DO NOT CHANGE
	_schedOption13 string // default value "on" DO NOT CHANGE

	schedOption1  bool // Lower Division 1-99
	schedOption11 bool // Lower Division 87&90s
	schedOption12 bool // Lower Division 99s
	schedOption2  bool // Upper Division 100-198
	schedOption4  bool // Upper Division 195s
	schedOption5  bool // Upper Division 199s
	schedOption3  bool // Graduate 200-297
	schedOption7  bool // Graduate 298s
	schedOption8  bool // Graduate 299s
	schedOption13 bool // Graduate 300+
	schedOption10 bool // Graduate 400+
	schedOption9  bool // Graduate 500+

	schDay  []ScheduleDay // values {M,T,W,R,F,S}. Yes, R = Thursday, and no Sunday
	_schDay []string      // values only contain "on" size = 6

	schStartTime string // i.e 12:00, increments of 15 minutes
	schStartAmPm uint8  // 0 = AM, 1=PM
	schEndTime   string // i.e 12:00, increments of 15 minutes
	schEndAmPm   uint8  // 0 = AM, 1=PM

	// tabNum = "tabs-dept"
	selectedDepartments  []string // list of departments codes
	_selectedDepartments uint8    // always 1. DO NOT CHANGE

	/* DO NOT QUESTION THE ORDERING*/
	schedOptionDept1  bool // Lower Division 1-99
	schedOptionDept11 bool // Lower Division 87&90s
	schedOptionDept12 bool // Lower Division 99s
	schedOptionDept2  bool // Upper Division 100-198
	schedOptionDept4  bool // Upper Division 195s
	schedOptionDept5  bool // Upper Division 199s
	schedOptionDept3  bool // Graduate 200-297
	schedOptionDept7  bool // Graduate 298s
	schedOptionDept8  bool // Graduate 299s
	schedOptionDept13 bool // Graduate 300+
	schedOptionDept10 bool // Graduate 400+
	schedOptionDept9  bool // Graduate 500+

	_schedOptionDept1 string // default value "on" DO NOT CHANGE
	_schedOptionDept2 string // default value "on" DO NOT CHANGE
	_schedOptionDept3 string // default value "on" DO NOT CHANGE
	_schedOptionDept4 string // default value "on" DO NOT CHANGE
	_schedOptionDept5 string // default value "on" DO NOT CHANGE
	// THERE IS NO _schedOptionDept6
	_schedOptionDept7  string // default value "on" DO NOT CHANGE
	_schedOptionDept8  string // default value "on" DO NOT CHANGE
	_schedOptionDept9  string // default value "on" DO NOT CHANGE
	_schedOptionDept10 string // default value "on" DO NOT CHANGE
	_schedOptionDept11 string // default value "on" DO NOT CHANGE
	_schedOptionDept12 string // default value "on" DO NOT CHANGE
	_schedOptionDept13 string // default value "on" DO NOT CHANGE

	schDayDept  []ScheduleDay // values {M,T,W,R,F,S}. Yes, R = Thursday, and no Sunday
	_schDayDept []string      // values only contain "on" size = 6

	schStartTimeDept string // i.e 12:00, increments of 15 minutes
	schStartAmPmDept uint8  // 0 = AM, 1=PM
	schEndTimeDept   string // i.e 12:00, increments of 15 minutes
	schEndAmPmDept   uint8  // 0 = AM, 1=PM

	// tab-crs
	courses string // CRLF/comma delimited lines, space replaced with "+"

	// tabs-sec
	sections string // CRLF, section codes delimited by literally anything

	// tabs-ins
	instructorType InsLogical // "begin" OR "contain" OR "exact"
	instructor     string     // string to operate on
	titleType      InsLogical // "begin" OR "contain" OR "exact"
	title          string     // string to operate on

	// General stuff
	hideFullSec  bool   // defaults to false
	_hideFullSec string // "on"
	showPopup    bool   // defaults to false and KEEP IT FALSE
	_showPopup   string // "on"
}

# `soc-scraper`
Here lies the backend to scrape class requirements from the UCSD TritonLink Portal. 
It would definitely be more performant to write this in Rust, but Go provides sensible async out of the box (rust does too, but it can be obtuse at times) and fast compile times for quick testing. Avoiding Selenium, or any other sort of browser automation tool is a priority because the UI overhead can aggregate quickly. 

## A couple of notes
- [Schedule of Classes](https://act.ucsd.edu/scheduleOfClasses/scheduleOfClassesFaculty.htm) can be accessed without logging in 
    - we can select multiple subjects and view a listing of all offered classes for a term at once (around 700 pages)
    - selecting "View Printer Friendly Page" condenses all of the info into one gigantic page (around 22MB) at the cost of taking ~7 minutes for a response from the web server

- there is also an API endpoint for this, which could be used
    - `https://act.ucsd.edu/scheduleOfClasses/scheduleOfClassesPreReq.htm?termCode=<TERM_CODE>&courseId=<COURSE_ID>` goes to a webpage with an easy-to-parse table with the requirements listed
    - we definitely need a session ID
- It is possible to get a list of ALL Departments at UCSD using `https://act.ucsd.edu/scheduleOfClasses/department-list.json?selectedTerm=WI26`
    - This requires NO authentication (not even cookies or a T5 session ID)

Bot protection is lackluster, and simply spoofing a User-Agent will trick the server into responding with cookies.
```
curl -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0" \
     -L "https://act.ucsd.edu/scheduleOfClasses/scheduleOfClassesFacultyResult.htm" \
     -c cookies.txt \
     -o ucsd_schedule.html
```
```json
{
"itscookie ":	"!some cookie",
"jlinkauthserver ":	"cupples",
"jlinksessionidx	":"z60f54f144cc343c504f5645be5dd2472",
"JSESSIONID	":"65162E14DF39F2D301D74EE57BBD66FE",
"TS01111c3f" :	"T5 bot protection id",
"TS019aef32" :	"T5 bot protection id 2 (seems to be optional)"
}
```
By making a relevant request with the fields of interest it is possible to get a paginated view of the courses page. We can switch to the printer view without resending data by simply querying the printer endpoint *after* the paginated endpoint.

## Request (also in the header)
As with many legacy systems,  Schedule of Classes uses `application/x-www-form-urlencoded` to interact with its API endpoint. This is a mostly complete list of what is sent in a POST request to `https://act.ucsd.edu/scheduleOfClasses/scheduleOfClassesFacultyResult.htm`. Some fields may not be required.
```ini
selectedTerm=WI26
tabNum=""
selectedSubjects=AIP 
selectedSubjects=AAS 
# ... enumerates all selected departments
_selectedSubjects=1
# ^ for some reason this exists
schedOption1=true
_schedOption1=on
schedOption11=true
_schedOption11=on
schedOption12=true
_schedOption12=on
schedOption2=true
_schedOption2=on
schedOption4=true
_schedOption4=on
schedOption5=true
_schedOption5=on
schedOption3=true
_schedOption3=on
schedOption7=true
_schedOption7=on
schedOption8=true
_schedOption8=on
schedOption13=true
_schedOption13=on
schedOption10=true
_schedOption10=on
schedOption9=true
_schedOption9=on
schDay=M
_schDay=on
schDay=T
_schDay=on
schDay=W
_schDay=on
schDay=R
_schDay=on
schDay=F
_schDay=on
schDay=S
_schDay=on
schStartTime=12:00
schStartAmPm=0
schEndTime=12:00
schEndAmPm=0
_selectedDepartments=1
schedOption1Dept=true
_schedOption1Dept=on
_schedOption11Dept=on
_schedOption12Dept=on
schedOption2Dept=true
_schedOption2Dept=on
_schedOption4Dept=on
_schedOption5Dept=on
_schedOption3Dept=on
_schedOption7Dept=on
_schedOption8Dept=on
_schedOption13Dept=on
_schedOption10Dept=on
_schedOption9Dept=on
schDayDept=M
_schDayDept=on
schDayDept=T
_schDayDept=on
schDayDept=W
_schDayDept=on
schDayDept=R
_schDayDept=on
schDayDept=F
_schDayDept=on
schDayDept=S
_schDayDept=on
schStartTimeDept=12:00
schStartAmPmDept=0
schEndTimeDept=12:00
schEndAmPmDept=0
courses=""
sections=""
instructorType=begin
instructor=""
titleType=contain
title=""
_hideFullSec=on
_showPopup=on
```

package lib

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/cookiejar"
	"net/url"
	"soc-scrape/lib/courses"

	"github.com/gorilla/schema"
)

type Client struct {
	http_client *http.Client
}

/*
Initialize a new HTTP Client with the proper cookie configuration
*/
func InitializeClient() (*Client, error) {
	client := &http.Client{}
	jar, err := cookiejar.New(nil)
	if err != nil {
		return nil, err
	}
	client.Jar = jar
	req, err := http.NewRequest(http.MethodGet, "https://act.ucsd.edu/scheduleOfClasses/scheduleOfClassesFacultyResult.htm", nil)
	if err != nil {
		return nil, err
	}
	// Spoof User-Agent
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0")
	_, err = client.Do(req)
	if err != nil {
		return nil, err
	}

	/*
		url, err := url.Parse("https://act.ucsd.edu/scheduleOfClasses/scheduleOfClassesFacultyResult.htm")
		if err != nil {
			return nil, err
		}
			for _, c := range client.Jar.Cookies(url) {
				fmt.Printf("%s : %s \n", c.Name, c.Value)
			}
	*/

	return &Client{http_client: client}, nil
}

func (c *Client) GetAllDepartments(selectedTerm string) ([]courses.Department, error) {
	req, err := http.NewRequest(http.MethodGet, fmt.Sprintf("https://act.ucsd.edu/scheduleOfClasses/department-list.json?selectedTerm=%s", selectedTerm), nil)
	if err != nil {
		return nil, nil
	}
	resp, err := c.http_client.Do(req)
	if err != nil {
		return nil, nil
	}
	depList := make([]courses.Department, 0)
	data, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, nil
	}
	json.Unmarshal(data, &depList)
	return depList, nil

}

func (c *Client) GetPrerequisites(termCode string, courseId string) (*courses.PrereqNode, error) {
	req, err := http.NewRequest(http.MethodGet, fmt.Sprintf("https://act.ucsd.edu/scheduleOfClasses/scheduleOfClassesPreReq.htm?termCode=%s&courseId=%s", termCode, courseId), nil)
	if err != nil {
		return nil, nil
	}
	resp, err := c.http_client.Do(req)
	if err != nil {
		return nil, nil
	}
	// TODO: pass this data to a HTML parsing library to get what we exactly want
	res, err := parseClassRequirements(resp.Body)
	if err != nil {
		return nil, nil
	}
	return res, nil
}

func (c *Client) GetCourseList(request *SearchRequestForm) ([]courses.Course, error) {
	encoder := schema.NewEncoder()
	form := url.Values{}
	err := encoder.Encode(*request, form)
	if err != nil {
		return nil, err
	}
	//for k, v := range form {
	//	fmt.Printf("%s %s\n", k, v)
	//}
	_, err = c.http_client.PostForm("https://act.ucsd.edu/scheduleOfClasses/scheduleOfClassesFacultyResult.htm", form)
	if err != nil {
		return nil, err
	}
	resp, err := c.http_client.Get("https://act.ucsd.edu/scheduleOfClasses/scheduleOfClassesFacultyResultPrint.htm")
	if err != nil {
		return nil, err
	}
	//b, _ := io.ReadAll(resp.Body)
	//fmt.Println(string(b))

	// TODO: pass this data to a HTML parsing library to get what we exactly want
	css, err := parseSearchResults(resp.Body)
	if err != nil {
		return nil, err
	}
	return css, nil
}

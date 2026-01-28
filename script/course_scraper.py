import httpx
from bs4 import BeautifulSoup
import pandas as pd
import pdb

with open('valid_codes.txt') as f:
    subject_codes = [line.strip() for line in f]

blank_url = 'https://catalog.ucsd.edu/courses/{}.html'
headers = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36"
}

def main():
    for code in subject_codes:
        response_html = fetch_html(code)

        soup = BeautifulSoup(response_html, 'html.parser')

        course_names = soup.find_all(class_='course-name')
        course_desc = extract_descriptions(course_names)

        codes = [name.get_text(strip=True).split(".")[0] for name in course_names]
        title = [
            name.get_text(strip=True).split(".")[1].split(" (")[0].strip()
            if len(name.get_text(strip=True).split(".")) > 1 else ""
            for name in course_names
        ]
        course_prereq = parse_prereqs(course_desc)

        data = {
            'Code': codes,
            'Title': title,
            "Description": course_desc,
            "Prerequisites": course_prereq
        }
        df = pd.DataFrame(data)
        df.to_csv(f'data/{code}.csv', index=False)
        print(f"Saved data/{code}.csv")

def fetch_html(code):
    url = blank_url.format(code)
    response = httpx.get(url, headers=headers)
    return response.text

def extract_descriptions(course_names):
    descriptions = []
    for name in course_names:
        desc = "No description available"
        sibling = name.find_next_sibling()
        while sibling:
            if 'course-descriptions' in sibling.get('class', []):
                desc = sibling.get_text(strip=True)
                break
            if 'course-name' in sibling.get('class', []):
                break
            sibling = sibling.find_next_sibling()
        descriptions.append(desc)
    return descriptions

def parse_prereqs(descriptions):
    course_prereqs = []
    for description in descriptions:
        if 'Prerequisites:' in description:
            prereq_section = description.split('Prerequisites:')[1]
            found_prereqs = prereq_section.split('.')[0].strip()
        else:
            found_prereqs = "N/A"
        course_prereqs.append(found_prereqs)
    return course_prereqs

if __name__ == '__main__':
    main()
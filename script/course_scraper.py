import httpx
from bs4 import BeautifulSoup
import pandas as pd

with open('valid_codes.txt') as f:
    subject_codes = [line.strip() for line in f]

blank_url = 'https://catalog.ucsd.edu/courses/{}.html'
headers = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36"
}

def main():
    all_data = []
    for code in subject_codes:
        response_html = fetch_html(code)
        soup = BeautifulSoup(response_html, 'html.parser')

        course_names = soup.find_all(class_='course-name')
        course_desc = extract_descriptions(course_names)

        codes = [name.get_text(strip=True).split(".")[0] for name in course_names]
        titles = [
            name.get_text(strip=True).split(".")[1].split(" (")[0].strip()
            if len(name.get_text(strip=True).split(".")) > 1 else ""
            for name in course_names
        ]
        course_prereq = parse_prereqs(course_desc)

        for i in range(len(codes)):
            print(f"Processing {codes[i]}...")
            all_data.append({
                'Subject': code,
                'Code': codes[i],
                'Title': titles[i],
                "Prerequisites": course_prereq[i]
            })

    df = pd.DataFrame(all_data)
    df.to_csv('data/all_courses.csv', index=False)
    print("Saved data/all_courses.csv")

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
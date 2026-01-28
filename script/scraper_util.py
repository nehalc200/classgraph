import httpx
from bs4 import BeautifulSoup
import pandas as pd

with open('subject_codes.txt') as f:
    subject_codes = [line.strip() for line in f]

blank_url = 'https://catalog.ucsd.edu/courses/{}.html'
headers = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36"
}



def main():
    valid_subjects = validate_subjects()
    update_codes_file(valid_subjects)


def validate_subjects():
    valid = []
    for code in subject_codes:
        response = httpx.get(blank_url.format(code), headers=headers)
        soup = BeautifulSoup(response.text, 'html.parser')
        error_div = soup.find('div', class_='col-lg-12 text-center error-page')
        if error_div:
            continue
        else:
            valid.append(code)
    return valid

def update_codes_file(list):
    with open('valid_codes.txt', 'w') as f:
        for code in list:
            f.write(f"{code}\n")


if __name__ == "__main__":
    main()

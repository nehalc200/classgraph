from pathlib import Path
import json

def load_json(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        return json.load(f)

def save_json(data, filepath):
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


def calculate_diffs(data1_dict, data2_dict):

    sclass = list(data1_dict.keys())
    wclass = list(data2_dict.keys())
    
    diff1 = list(set(sclass) - set(wclass))  
    diff2 = list(set(wclass) - set(sclass))  
    common = list(set(sclass) & set(wclass))  
    
    diff1.sort()
    diff2.sort()
    common.sort()
    
    return diff1, diff2, common

def combine_courses(data1_dict, data2_dict, diff1, diff2, common):

    combined = []
    
    # Add courses only in data1
    for code in diff1:
        combined.append(data1_dict[code])
    
    # Add courses only in data2
    for code in diff2:
        combined.append(data2_dict[code])
    
    # Add common courses 
    for code in common:
        combined.append(data1_dict[code])
    
    combined.sort(key=lambda x: x["course"]["code"])
    
    rm = find_remote_courses(combined)
    for item in combined:
        code = item["course"]["code"]
        
        if code in rm:
            reg_code = item["course"]["code"][:-1]
            # Fetch notes from the regular version (without the 'R') if it exists
            reg_item = next((i for i in combined if i["course"]["code"] == reg_code), None)
            reg_notes = reg_item["course"].get("notes", []) if reg_item else []
            reg_notes.append("Remote course also offered")
            item["course"]["notes"] = reg_notes
            combined.remove(item)

    return combined

def find_remote_courses(combined):
    remote_courses = []
    for item in combined:
        code = item["course"]["code"]
        if code.endswith("R") and "POLI" not in code: # Exclude POLI courses because they squis all into one course code
            remote_courses.append(code)
    return remote_courses


if __name__ == '__main__':
    path1 = 'data/SOC_list.json'
    path2 = 'data/webreg_data.json'

    data1_dict = {item["course"]["code"]: item for item in load_json(path1)}
    data2_dict = {item["course"]["code"]: item for item in load_json(path2)}

    diff1, diff2, common = calculate_diffs(data1_dict, data2_dict)
    combined = combine_courses(data1_dict, data2_dict, diff1, diff2, common)

    save_json(combined, 'data/combined.json')
    print("File saved to data/combined.json")
    
    
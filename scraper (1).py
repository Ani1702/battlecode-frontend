import os
import requests
import json
import time
import uuid
from datetime import datetime
import pandas as pd
import random
from bs4 import BeautifulSoup
import google.generativeai as genai
import csv
import cloudscraper

# --- Part 1: AI Integration (No Changes) ---
def call_gemini_ai(prompt):
    try:
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("GEMINI_API_KEY environment variable not set!")
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('gemini-2.5-flash')
        response = model.generate_content(prompt)
        if response.parts:
            return response.text
        else:
            print("[AI Assistant]: The model returned an empty response.")
            return None
    except Exception as e:
        print(f"An error occurred with the Gemini API: {e}")
        return None

# --- Part 2: Platform Scrapers and Fetchers ---

# --- LeetCode Module (No Changes) ---
def get_random_leetcode_problem():
    print("[Fetcher]: Finding a random problem from LeetCode...")
    try:
        api_url = "https://leetcode.com/api/problems/all/"
        headers = {'User-Agent': 'Mozilla/5.0'}
        response = requests.get(api_url, headers=headers, timeout=15)
        response.raise_for_status()
        problems = response.json()['stat_status_pairs']
        free_easy_problems = [p for p in problems if not p['paid_only'] and p['difficulty']['level'] == 1]
        if not free_easy_problems: return None, None, None
        chosen_problem = random.choice(free_easy_problems)
        stat = chosen_problem['stat']
        slug, original_title, problem_id = stat['question__title_slug'], stat['question__title'], stat['question_id']
        problem_url, reference_id = f"https://leetcode.com/problems/{slug}/", f"LC-{problem_id}"
        print(f"[Fetcher]: Selected LeetCode problem: '{original_title}' ({reference_id})")
        return problem_url, original_title, reference_id
    except Exception as e:
        print(f"An error occurred while fetching the LeetCode problem list: {e}")
        return None, None, None

def scrape_leetcode_problem(url):
    try:
        slug = url.strip('/').split('/')[-1]
        api_url = "https://leetcode.com/graphql"
        payload = {"query": "query questionContent($titleSlug: String!) { question(titleSlug: $titleSlug) { content } }", "variables": {"titleSlug": slug}}
        headers = {'User-Agent': 'Mozilla/5.0', 'Content-Type': 'application/json', 'Referer': url}
        response = requests.post(api_url, headers=headers, data=json.dumps(payload), timeout=15)
        response.raise_for_status()
        data = response.json()
        html_content = data['data']['question']['content']
        soup = BeautifulSoup(html_content, 'html.parser')
        return soup.get_text()
    except Exception as e:
        return f"Error scraping LeetCode description: {e}"

# --- Codeforces Module (UPDATED) ---
def get_random_codeforces_problem():
    print("[Fetcher]: Finding a random problem from Codeforces...")
    try:
        api_url = "https://codeforces.com/api/problemset.problems"
        scraper = cloudscraper.create_scraper()
        response = scraper.get(api_url, timeout=15)
        response.raise_for_status()
        problems = response.json()['result']['problems']
        easy_problems = [p for p in problems if 'rating' in p and p['rating'] <= 1200]
        if not easy_problems: return None, None, None
        chosen_problem = random.choice(easy_problems)
        contest_id, index, original_title = chosen_problem['contestId'], chosen_problem['index'], chosen_problem['name']
        problem_url, reference_id = f"https://codeforces.com/problemset/problem/{contest_id}/{index}", f"CF-{contest_id}{index}"
        print(f"[Fetcher]: Selected Codeforces problem: '{original_title}' ({reference_id})")
        return problem_url, original_title, reference_id
    except Exception as e:
        print(f"An error occurred while fetching the Codeforces problem list: {e}")
        return None, None, None

def scrape_codeforces_problem(url):
    """
    Scrapes the Codeforces problem and cleans up LaTeX formatting.
    """
    try:
        scraper = cloudscraper.create_scraper()
        response = scraper.get(url, timeout=20)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.content, 'html.parser')
        problem_div = soup.find('div', class_='problem-statement')
        if problem_div:
            raw_text = problem_div.get_text(separator='\n', strip=True)
            clean_text = raw_text.replace('$$$', '')
            return clean_text
        else:
            return "Error: Could not find the problem statement div on the page."
    except Exception as e:
        return f"Error scraping Codeforces description: {e}"

# --- Part 3: The Main Pipeline (No Changes) ---
if __name__ == "__main__":
    output_csv_file = "new_problems.csv"
    
    problem_url, original_title, reference_id, original_description = None, None, None, None
    
    platform = random.choice(['codeforces'])
    
    print(f"\n--- Starting Pipeline for platform: {platform.upper()} ---")

    if platform == 'leetcode':
        problem_url, original_title, reference_id = get_random_leetcode_problem()
        if problem_url:
            original_description = scrape_leetcode_problem(problem_url)
    elif platform == 'codeforces':
        problem_url, original_title, reference_id = get_random_codeforces_problem()
        if problem_url:
            original_description = scrape_codeforces_problem(problem_url)

    if not problem_url:
        print("[Pipeline HALTED]: Failed to fetch a problem URL.")
    elif not original_description or "Error" in original_description:
        print(f"[Pipeline HALTED]: Failed to scrape description for '{original_title}'.")
        print(f"Reason: {original_description}")
    else:
        print(f"\n[AI Assistant]: Starting generation for '{original_title}'...")
        
        reskin_prompt = f"""
        Rewrite the following coding problem with a completely new and creative story.
        Do NOT change the underlying logic, inputs, outputs, or constraints.
        Return ONLY the new title and the new description, separated by '---'.
        
        ORIGINAL TITLE: {original_title}
        ORIGINAL DESCRIPTION: {original_description}
        """
        ai_response = call_gemini_ai(reskin_prompt)

        if ai_response:
            try:
                ai_title, ai_description = ai_response.split('---', 1)
            except ValueError:
                print("[AI Assistant]: Error: The re-skinning response was not in the expected format.")
                exit()

            data_gen_prompt = f"""
            Based on the logic of the following coding problem, generate a single, clean JSON object.
            The JSON object must have these exact keys: "difficulty", "category", "constraints", "hints", "boilerplate", "sampleTestCases", "hiddenTestCases", "correctSolution", "avgTimeComplexity", "avgSpaceComplexity".
            
            **FORMATTING RULES:**
            - 'sampleTestCases' and 'hiddenTestCases' MUST be an array of objects with "stdin" and "expected_output" keys.
            - "stdin" and "expected_output" values must be single strings, with newlines as \\n.
            - 'category' must be an array of strings.
            - 'correctSolution' must be a string with the full Python solution.
            - 'boilerplate' must be a JSON object with keys for "python", "java", "cpp", and "c".
            - 'hints' must be an array of 3 strings.

            ORIGINAL PROBLEM:
            {original_description}
            """
            ai_data_json_str = call_gemini_ai(data_gen_prompt)

            if ai_data_json_str:
                try:
                    clean_json_str = ai_data_json_str.strip().lstrip('```json').rstrip('```')
                    generated_data = json.loads(clean_json_str)

                    final_problem = {
                        "id": str(uuid.uuid4()),
                        "title": ai_title.strip(),
                        "description": ai_description.strip(),
                        "reference": reference_id,
                        "difficulty": generated_data.get("difficulty"),
                        "category": json.dumps(generated_data.get("category", [])),
                        "constraints": json.dumps(generated_data.get("constraints", [])),
                        "hints": json.dumps(generated_data.get("hints", [])),
                        "boilerplate": json.dumps(generated_data.get("boilerplate", {})),
                        "sampleTestCases": json.dumps(generated_data.get("sampleTestCases", [])),
                        "hiddenTestCases": json.dumps(generated_data.get("hiddenTestCases", [])),
                        "correctSolution": generated_data.get("correctSolution"),
                        "avgTimeComplexity": generated_data.get("avgTimeComplexity"),
                        "avgSpaceComplexity": generated_data.get("avgSpaceComplexity"),
                        "createdAt": datetime.utcnow().isoformat(),
                        "updatedAt": datetime.utcnow().isoformat(),
                        "roundId": "your-default-round-id"
                    }
                    
                    df = pd.DataFrame([final_problem])
                    file_exists = os.path.isfile(output_csv_file)
                    df.to_csv(
                        output_csv_file, 
                        mode='a', 
                        header=not file_exists, 
                        index=False,
                        quoting=csv.QUOTE_ALL
                    )

                    print(f"\n[Exporter]: Success! New problem '{ai_title.strip()}' has been saved to {output_csv_file}")
                    print("\n--- FULLY AUTOMATED PIPELINE COMPLETE ---")

                except json.JSONDecodeError:
                    print(f"[AI Assistant]: Error: Failed to decode the JSON response from the AI.")
                    print(f"Received: {ai_data_json_str}")
from functools import lru_cache

import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity


COURSE_COLUMNS = {
    "Course Name": "title",
    "University": "provider",
    "Difficulty Level": "difficulty",
    "Course Rating": "rating",
    "Course URL": "url",
    "Course Description": "description",
    "Skills": "skills",
}


@lru_cache(maxsize=1)
def load_catalog():
    dataframe = pd.read_csv("Courser.csv").fillna("")
    search_text = (
        dataframe["Course Name"].astype(str)
        + " "
        + dataframe["Skills"].astype(str)
        + " "
        + dataframe["Course Description"].astype(str)
    )
    vectorizer = TfidfVectorizer(
        strip_accents="unicode",
        stop_words="english",
        ngram_range=(1, 2),
        max_features=30000,
    )
    matrix = vectorizer.fit_transform(search_text)
    return dataframe, vectorizer, matrix


def _course_record(row):
    result = {}
    for source, destination in COURSE_COLUMNS.items():
        value = row.get(source, "")
        if destination == "rating":
            try:
                value = float(value)
            except (TypeError, ValueError):
                value = None
        result[destination] = value
    return result


def search_courses(query, limit=8):
    cleaned_query = (query or "").strip()
    if not cleaned_query:
        return []

    dataframe, vectorizer, matrix = load_catalog()
    query_vector = vectorizer.transform([cleaned_query])
    scores = cosine_similarity(query_vector, matrix).flatten()
    ranked_indices = scores.argsort()[::-1]

    results = []
    for index in ranked_indices:
        if scores[index] <= 0 and results:
            break
        record = _course_record(dataframe.iloc[index])
        record["matchScore"] = round(float(scores[index]), 4)
        results.append(record)
        if len(results) >= max(1, min(int(limit), 20)):
            break
    return results

import json
from datetime import datetime

from flask_sqlalchemy import SQLAlchemy


db = SQLAlchemy()


def _json_loads(value, fallback):
    if not value:
        return fallback
    try:
        return json.loads(value)
    except (TypeError, json.JSONDecodeError):
        return fallback


class InterviewSession(db.Model):
    id = db.Column(db.String(36), primary_key=True)
    profile_json = db.Column(db.Text, nullable=False, default="{}")
    role = db.Column(db.String(255), nullable=False)
    difficulty = db.Column(db.String(32), nullable=False)
    duration = db.Column(db.String(32), nullable=False)
    title = db.Column(db.String(255), nullable=False)
    questions_json = db.Column(db.Text, nullable=False, default="[]")
    answers_json = db.Column(db.Text, nullable=False, default="[]")
    report_json = db.Column(db.Text, nullable=True)
    status = db.Column(db.String(32), nullable=False, default="active")
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(
        db.DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )

    @property
    def profile(self):
        return _json_loads(self.profile_json, {})

    @property
    def questions(self):
        return _json_loads(self.questions_json, [])

    @property
    def answers(self):
        return _json_loads(self.answers_json, [])

    @property
    def report(self):
        return _json_loads(self.report_json, None)

    def set_answers(self, value):
        self.answers_json = json.dumps(value, ensure_ascii=False)

    def set_report(self, value):
        self.report_json = json.dumps(value, ensure_ascii=False)

    def prompt_context(self):
        return {
            "profile": self.profile,
            "role": self.role,
            "difficulty": self.difficulty,
            "duration": self.duration,
            "questions": self.questions,
            "answers": self.answers,
        }

    def to_summary(self):
        scores = [
            answer.get("feedback", {}).get("score")
            for answer in self.answers
            if isinstance(answer.get("feedback", {}).get("score"), (int, float))
        ]
        average_score = round(sum(scores) / len(scores), 1) if scores else None
        return {
            "id": self.id,
            "title": self.title,
            "role": self.role,
            "difficulty": self.difficulty,
            "status": self.status,
            "answeredQuestions": len(self.answers),
            "totalQuestions": len(self.questions),
            "averageScore": average_score,
            "overallScore": (self.report or {}).get("overallScore"),
            "createdAt": self.created_at.isoformat(),
        }


class ProviderUsage(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    provider = db.Column(db.String(64), nullable=False, index=True)
    operation = db.Column(db.String(64), nullable=False)
    success = db.Column(db.Boolean, nullable=False, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False, index=True)

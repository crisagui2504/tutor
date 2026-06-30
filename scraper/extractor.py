import re
from collections import Counter

# Catalogo de skills del mercado tech mexicano (OCC / LinkedIn)
SKILLS_CATALOG = [
    # Lenguajes
    "Python", "Java", "JavaScript", "TypeScript", "C#", "C++", "PHP",
    "Ruby", "Go", "Kotlin", "Swift", "Rust", "Scala", "R",
    # Frontend
    "React", "Angular", "Vue", "Next.js", "Nuxt", "HTML", "CSS",
    "SASS", "Bootstrap", "Tailwind", "jQuery",
    # Backend
    "Node.js", "Django", "Flask", "FastAPI", "Spring Boot", "Laravel",
    "Express", "NestJS", ".NET", "ASP.NET",
    # Bases de datos
    "SQL", "MySQL", "PostgreSQL", "MongoDB", "Redis", "Oracle",
    "SQL Server", "MariaDB", "Cassandra", "Elasticsearch", "DynamoDB",
    # Cloud / DevOps
    "AWS", "Azure", "GCP", "Google Cloud", "Docker", "Kubernetes",
    "Git", "GitHub", "GitLab", "CI/CD", "Jenkins", "Terraform",
    "Linux", "Bash", "Ansible",
    # Data
    "Machine Learning", "Deep Learning", "TensorFlow", "PyTorch",
    "Pandas", "NumPy", "Scikit-learn", "Power BI", "Tableau",
    "Spark", "Hadoop", "ETL", "Data Science",
    # Mobile
    "Android", "iOS", "React Native", "Flutter", "Xamarin",
    # Metodologias / otros
    "Scrum", "Agile", "Kanban", "DevOps", "REST", "GraphQL",
    "Microservicios", "Microservices", "SOAP", "API REST",
    # Idiomas / soft
    "inglés avanzado", "inglés intermedio", "inglés técnico",
    "inglés B2", "inglés C1", "inglés",
]


def extract_skills(text: str) -> list[str]:
    """Busca skills en `text` por keyword matching con limites de palabra."""
    text_lower = text.lower()
    found = []
    for skill in SKILLS_CATALOG:
        pattern = r'\b' + re.escape(skill.lower()) + r'\b'
        if re.search(pattern, text_lower):
            found.append(skill)
    return list(set(found))


def rank_skills(skill_lists: list[list[str]], top_n: int = 20) -> list[dict]:
    """Cuenta frecuencia y devuelve los top_n skills como lista de dicts."""
    flat = [skill for sublist in skill_lists for skill in sublist]
    total = len(skill_lists) or 1
    return [
        {"skill": skill, "count": count, "pct": round(count / total * 100)}
        for skill, count in Counter(flat).most_common(top_n)
    ]

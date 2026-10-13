CAREER_MARKET_ROLES = {
    "BBA- Bachelor of Business Administration": "Business Analyst",
    "BEM- Bachelor of Event Management": "Event Coordinator",
    "Integrated Law Course- BA + LL.B": "Legal Associate",
    "BJMC- Bachelor of Journalism and Mass Communication": "Journalist",
    "BFD- Bachelor of Fashion Designing": "Fashion Designer",
    "BBS- Bachelor of Business Studies": "Business Analyst",
    "BTTM- Bachelor of Travel and Tourism Management": "Travel Consultant",
    "BVA- Bachelor of Visual Arts": "Graphic Designer",
    "BA in History": "Research Assistant",
    "B.Arch- Bachelor of Architecture": "Architect",
    "BCA- Bachelor of Computer Applications": "Software Developer",
    "B.Sc.- Information Technology": "IT Support Specialist",
    "B.Sc- Nursing": "Registered Nurse",
    "BPharma- Bachelor of Pharmacy": "Pharmacist",
    "BDS- Bachelor of Dental Surgery": "Dentist",
    "Animation, Graphics and Multimedia": "Animator",
    "B.Sc- Applied Geology": "Geologist",
    "B.Sc.- Physics": "Physics Research Assistant",
    "B.Sc. Chemistry": "Chemist",
    "B.Sc. Mathematics": "Data Analyst",
    "B.Tech.-Civil Engineering": "Civil Engineer",
    "B.Tech.-Computer Science and Engineering": "Software Engineer",
    "B.Tech.-Electrical and Electronics Engineering": "Electrical Engineer",
    "B.Tech.-Electronics and Communication Engineering": "Electronics Engineer",
    "B.Tech.-Mechanical Engineering": "Mechanical Engineer",
    "B.Com- Bachelor of Commerce": "Accountant",
    "BA in Economics": "Economic Analyst",
    "CA- Chartered Accountancy": "Chartered Accountant",
    "CS- Company Secretary": "Company Secretary",
    "Diploma in Dramatic Arts": "Actor",
    "MBBS": "Doctor",
    "Civil Services": "Public Administration Officer",
    "BA in English": "Content Writer",
    "BA in Hindi": "Hindi Translator",
    "B.Ed.": "Teacher",
}


def market_role_for_path(career_path):
    cleaned = str(career_path or "").strip()
    return CAREER_MARKET_ROLES.get(cleaned, cleaned)


def normalize_market_role(role):
    cleaned = " ".join(str(role or "").split())
    return market_role_for_path(cleaned)

# MediCare – AI-Powered Medicine Reminder and Healthcare Management System

## About the Project

MediCare is an AI-powered healthcare web application developed during the **Centre for Entrepreneurship Development (CED) Software Development Internship**.

The application helps users manage their medicines, appointments and basic health information. It also uses AI to analyse prescription images and extract medicine details, reducing the need to enter them manually.

## Features

- **Medicine Management:** Add and manage medicine details and dosage information.
- **Medicine Reminders:** Help users keep track of their medicine schedules.
- **Appointment Management:** Manage healthcare appointments.
- **Patient Profiles:** Maintain basic user and health-related information.
- **AI Prescription Scanner:** Use Gemini AI to analyse prescription images and extract medicine details.
- **Email OTP Verification:** Send verification codes to users through email.
- **Email Notifications:** Support email-based communication and reminders.
- **Health Tips:** Provide useful healthcare information.

## Technologies Used

**Frontend**
- React.js
- TypeScript
- Vite
- Tailwind CSS

**Backend**
- Node.js
- Express.js
- REST APIs

**AI and Integrations**
- Google Gemini AI
- Nodemailer
- Axios

## How It Works

1. Users access the MediCare web application.
2. Users manage their medicine details and schedules.
3. Prescription images can be uploaded for AI-based analysis.
4. Gemini AI extracts medicine information from the prescription.
5. Users can manage appointments and profile information.
6. Email services support OTP verification and notifications.

## Installation and Setup

### 1. Clone the Repository

```bash
git clone https://github.com/Coder-131106/MediCare.git
cd MediCare
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env` file in the project root and add your Gemini API key:

```env
GEMINI_API_KEY=your_gemini_api_key
```

Email credentials should also be moved into environment variables before running the application. Never upload API keys, passwords or other secrets to GitHub.

### 4. Run the Application

```bash
npm run dev
```

Open the application at:

```text
http://localhost:3000
```

## Internship Experience

**Centre for Entrepreneurship Development (CED), Anna University**  
Software Development Intern | 22 June 2026 – 04 July 2026

Developed MediCare as part of the internship, gaining practical experience in full-stack development, AI integration, REST API development and email services.

## Author

**Sowjanya P.**  
B.Tech – Information Technology

<div align="center">
  <h1>💊 MedSafe AI</h1>
  <p><em>A smart medicine safety platform that tracks prescriptions, detects dangerous drug interactions using FDA data, and provides AI-powered health insights for patients and their families.</em></p>

  [![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.2.4-brightgreen.svg?logo=springboot)](https://spring.io/projects/spring-boot)
  [![React](https://img.shields.io/badge/React-18-blue.svg?logo=react)](https://reactjs.org/)
  [![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-blue.svg?logo=postgresql)](https://www.postgresql.org/)
  [![Vite](https://img.shields.io/badge/Vite-5.4-purple.svg?logo=vite)](https://vitejs.dev/)
</div>

<hr />

## ✨ Key Features

- 📝 **Prescription Tracking**: Easily log and manage your daily medications.
- 🚨 **FDA Drug Interaction Checker**: Automatically detects potentially dangerous drug interactions using OpenFDA data to keep you safe.
- 🤖 **AI-Powered Insights**: Get personalized health insights, usage guidance, and risk assessments using advanced AI integration.
- ⏰ **Smart Reminders**: Automated email reminders for your scheduled doses so you never miss a medication. Includes intelligent auto-missed detection.
- 👨‍👩‍👧 **Family & Caregiver Support**: Manage medications for family members and send automatic alerts to designated caregivers if a crucial dose is missed.
- 📄 **PDF Reporting**: Generate comprehensive medication and interaction reports in PDF format for easy sharing with your healthcare provider.

## 🛠️ Technology Stack

**Backend Architecture:**
- **Java 17** & **Spring Boot 3.2.x** (Web, Data JPA, Security)
- **PostgreSQL** for reliable data persistence
- **JWT Authentication** for secure user sessions
- **Spring Mail** for automated reminder notifications
- **OpenPDF** for dynamic report generation
- **Swagger UI** for interactive API documentation

**Frontend Architecture:**
- **React 18** for a modern user interface
- **Vite** for blazing fast build and development
- **React Router DOM** for client-side routing
- **Axios** for API communication
- **Lucide React** for beautiful, consistent iconography

## 🚀 Getting Started

### Prerequisites
Make sure you have the following installed on your machine:
- JDK 17
- Node.js & npm (v18+ recommended)
- PostgreSQL

### Backend Setup
1. Navigate to the project root directory.
2. Create your PostgreSQL database.
3. Configure your database connection in `src/main/resources/application.yml` or `application-prod.yml`.
4. Run the Spring Boot application using Maven:
   ```bash
   ./mvnw spring-boot:run
   ```
   *The backend will typically start on `http://localhost:8080`.*

### Frontend Setup
1. Open a new terminal and navigate to the `frontend` directory:
   ```bash
   cd frontend
   ```
2. Install the required Node.js dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
   *The frontend will typically start on `http://localhost:5173`.*

## 📚 API Documentation
Once the Spring Boot backend is running, you can explore and test all API endpoints using the interactive Swagger UI:
👉 **[http://localhost:8080/swagger-ui.html](http://localhost:8080/swagger-ui.html)**

## 🤝 Contributing
Contributions, issues, and feature requests are welcome! Feel free to check the issues page if you want to contribute.

## 📄 License
This project is licensed under the terms of the **LICENSE** file included in the repository.

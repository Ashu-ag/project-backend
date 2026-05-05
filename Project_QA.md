# Classroom Application - Interview Questions & Answers

## 1. General Architecture & System Design

**Q: What is the overall architecture of the Classroom App?**
**A:** The project is a distributed, service-oriented web application divided into three main components:
1. **Frontend:** A Single Page Application (SPA) built with React.js, handling the user interface, routing, and real-time interactions.
2. **Main Backend:** A Node.js/Express.js REST API that manages core business logic, user authentication, MongoDB database interactions, file uploads, and WebSockets for real-time chat.
3. **OCR & Search Microservice:** A dedicated Python (Flask) microservice designed exclusively for processing documents, extracting text via OCR, and running AI-powered semantic and hybrid search queries using machine learning models.

**Q: Which microservices are used in this project and why?**
**A:** The project implements a distinct **Python Flask OCR & Semantic Search Microservice** separate from the main Node.js backend. 
This microservice architecture was chosen because Python has a vastly superior ecosystem for machine learning and data processing. Libraries like `pytesseract` (for Optical Character Recognition), `sentence-transformers` (for generating AI text embeddings), and `scikit-learn` are native to Python. By decoupling this into a microservice, the main Node.js server remains highly responsive to user requests and is not blocked by CPU-intensive tasks like extracting text from PDFs or running neural network models.

## 2. Algorithms & Data Processing

**Q: What specific algorithms are used in the application?**
**A:** The application utilizes several key algorithms depending on the feature:
1. **Hybrid Search Algorithm (Search Engine):** Combines two distinct algorithms to retrieve documents:
   - **Keyword Matching (Lexical Search):** Uses tokenization and stop-word removal algorithms to filter out common words (like 'the', 'is', 'at') and performs exact-match frequency scoring (similar to TF-IDF) to find documents containing the exact search terms.
   - **Semantic Similarity (Dense Vector Search):** Uses Transformer-based Neural Network algorithms (via `sentence-transformers`) to convert text into high-dimensional vector embeddings. It then uses the **Cosine Similarity algorithm** (via `scikit-learn`) to calculate the mathematical angle between the search query's vector and the document's vector, allowing it to understand the "context" and meaning even if exact words don't match.
2. **Password Hashing (Security):** The backend uses the **Bcrypt algorithm** to securely hash and salt user passwords before storing them in the database, protecting against rainbow table and brute-force attacks.

## 3. Frontend (React.js)

**Q: What libraries are used in the React frontend for managing API requests, routing, and UI?**
**A:** 
* **Routing:** `react-router-dom` is used to manage page navigation (e.g., Dashboard, Classroom, Profile) without reloading the page.
* **API Calls:** `axios` is used as the HTTP client to communicate with the Node.js backend and handle authentication tokens in request headers.
* **Real-time:** `socket.io-client` connects to the backend WebSocket server for real-time chat and notifications.
* **Icons & UI:** `lucide-react` is used for modern, scalable SVG icons.

**Q: How did you solve the 404 API routing errors during deployment on the frontend?**
**A:** Hardcoded `localhost` references were replaced with a centralized Axios API instance using dynamic environment variables (`process.env.REACT_APP_API_URL`). Additionally, for Vercel deployment, a `vercel.json` configuration file was implemented to rewrite all frontend routes to `index.html` (for SPA routing) and securely proxy `/api/*` requests to the remote backend.

**Q: How is state managed in the React application?**
**A:** The application utilizes React's built-in Hooks like `useState` for local component state and `useEffect` for side-effects (like fetching data when a component mounts). For global state like user authentication, React Context API or lifting state to top-level components is used to pass the user session down to components like the Dashboard and Chat Panel.

## 4. Main Backend (Node.js & Express)

**Q: How is user authentication and Role-Based Access Control (RBAC) implemented?**
**A:** Authentication is handled using JSON Web Tokens (JWT) and the bcrypt algorithm. When a user logs in, the server compares the password hash and signs a JWT. 
For RBAC, the application defines strict roles (`Student`, `Teacher`, `Admin`). The backend middleware inspects the JWT payload to determine the user's role and restricts access to specific endpoints (e.g., separating Teacher administrative controls from Student views). A specific script (`create-admin.js`) was also built to seed the initial Admin user into the database.

**Q: How does the backend handle file uploads and document management?**
**A:** The backend uses `multer`, a middleware for handling `multipart/form-data`. When a user uploads a file, `multer` processes the stream and saves it to the server. Once saved, metadata (filename, uploader, file path) is stored in MongoDB via Mongoose, and the file is optionally routed to the Python OCR microservice for text extraction.

**Q: How do you secure the API endpoints?**
**A:** Endpoints are secured using a custom authentication middleware (`auth.js`). This middleware extracts the Bearer token from the `Authorization` header, verifies the signature using `jsonwebtoken` and the server's secret key, and attaches the decoded user ID and role to the request object (`req.user`). If the token is missing or invalid, the API returns a 401 Unauthorized or 403 Forbidden error.

## 5. OCR & AI Search Microservice (Python Flask)

**Q: What is the process for extracting text from uploaded files in the microservice?**
**A:** The microservice handles various file formats natively:
* **Images:** `pytesseract` (Tesseract OCR) and `Pillow` extract text from image files.
* **PDFs:** `pymupdf` extracts embedded text, and if the PDF contains scanned images, `pdf2image` converts pages to images to be run through OCR.
* **Word/Excel/PowerPoint:** `python-docx`, `openpyxl`, and `python-pptx` directly parse and extract text from Microsoft Office XML formats.

## 6. Real-Time Communication

**Q: How is the real-time Chat Panel implemented?**
**A:** Real-time communication uses the WebSocket protocol via `socket.io`. The backend Node.js server attaches a Socket.io server to the Express HTTP server. The React frontend uses `socket.io-client` to establish a persistent connection. When a user sends a message in `ChatPanel.js`, it is emitted to the server via WebSockets, saved to the database (via `routes/messages.js`), and broadcasted to the specific classroom room so all connected users instantly receive the message without refreshing.

## 7. Deployment & DevOps

**Q: Where are the different components of this application deployed?**
**A:** 
* **Frontend:** Deployed on **Vercel**, which provides CDN hosting for static React builds and allows for serverless routing configurations.
* **Node.js Backend:** Deployed on **Render** (or a similar PaaS), which supports background running node processes (`node server.js`) and persistent WebSocket connections.
* **Python Microservice:** Deployed as an independent web service.
* **Database:** MongoDB Atlas is used as the managed cloud database.

**Q: What is the purpose of the `Dockerfile` in the backend directory?**
**A:** The `Dockerfile` provides containerization for the Node.js backend. It defines the base OS, installs Node.js, copies the `package.json` dependencies, and explicitly defines how the server should be executed. This ensures that the backend runs identically on any environment, eliminating "it works on my machine" inconsistencies.

import { useEffect, useState } from "react";

const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:5000").replace(/\/$/, "");

const fileDefinitions = [
  { key: "pricelist", title: "Price List", description: "Upload the latest dealer price list as a PDF or image." },
  { key: "scheme", title: "Scheme", description: "Upload the current dealer scheme as a PDF or image." },
  { key: "catalog", title: "Product Catalog", description: "Upload the latest product catalog as a PDF or image." },
  { key: "productdetails", title: "Product Details", description: "Upload detailed product information as a PDF or image." }
];

const initialSelections = fileDefinitions.reduce((accumulator, file) => {
  accumulator[file.key] = null;
  return accumulator;
}, {});

const initialLoading = fileDefinitions.reduce((accumulator, file) => {
  accumulator[file.key] = false;
  return accumulator;
}, {});

const initialInputVersions = fileDefinitions.reduce((accumulator, file) => {
  accumulator[file.key] = 0;
  return accumulator;
}, {});

function App() {
  const [password, setPassword] = useState("");
  const [draftPassword, setDraftPassword] = useState("");
  const [files, setFiles] = useState({});
  const [selectedFiles, setSelectedFiles] = useState(initialSelections);
  const [uploading, setUploading] = useState(initialLoading);
  const [inputVersions, setInputVersions] = useState(initialInputVersions);
  const [isFetching, setIsFetching] = useState(true);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [alert, setAlert] = useState(null);

  useEffect(() => {
    fetchFiles();
  }, []);

  const parseJsonResponse = async (response) => {
    const text = await response.text();

    if (!text) {
      return {};
    }

    try {
      return JSON.parse(text);
    } catch {
      throw new Error("Server returned an unexpected response");
    }
  };

  const fetchFiles = async () => {
    setIsFetching(true);

    try {
      const response = await fetch(`${API_URL}/api/files`);
      const data = await parseJsonResponse(response);

      if (!response.ok) {
        throw new Error(data.message || "Failed to fetch files");
      }

      setFiles(data);
    } catch (error) {
      showAlert("error", error.message || "Unable to load file links");
    } finally {
      setIsFetching(false);
    }
  };

  const showAlert = (type, message) => {
    setAlert({ type, message });
  };

  const clearAlert = () => {
    setAlert(null);
  };

  const handleFileChange = (type, event) => {
    const nextFile = event.target.files?.[0] || null;

    setSelectedFiles((current) => ({
      ...current,
      [type]: nextFile
    }));
    clearAlert();
  };

  const handleLogin = async (event) => {
    event.preventDefault();

    if (!draftPassword.trim()) {
      showAlert("error", "Enter the admin password to continue");
      return;
    }

    setIsAuthenticating(true);
    clearAlert();

    try {
      const loginResponse = await fetch(`${API_URL}/api/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ password: draftPassword })
      });
      const loginData = await parseJsonResponse(loginResponse);

      if (!loginResponse.ok) {
        throw new Error(loginData.message || "Login failed");
      }

      const filesResponse = await fetch(`${API_URL}/api/files`);
      const filesData = await parseJsonResponse(filesResponse);

      if (!filesResponse.ok) {
        throw new Error(filesData.message || "Unable to load files");
      }

      setPassword(draftPassword);
      setFiles(filesData);
      setIsLoggedIn(true);
      showAlert("success", loginData.message || "Login successful");
    } catch (error) {
      showAlert("error", error.message || "Unable to connect to the server");
    } finally {
      setIsAuthenticating(false);
      setIsFetching(false);
    }
  };

  const handleLogout = () => {
    setDraftPassword("");
    setPassword("");
    setIsLoggedIn(false);
    setSelectedFiles(initialSelections);
    clearAlert();
  };

  const handleUpload = async (type) => {
    const file = selectedFiles[type];

    if (!password.trim()) {
      showAlert("error", "Enter the admin password before uploading");
      return;
    }

    if (!file) {
      showAlert("error", "Select a file before uploading");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("password", password);

    setUploading((current) => ({
      ...current,
      [type]: true
    }));
    clearAlert();

    try {
      const response = await fetch(`${API_URL}/api/upload/${type}`, {
        method: "POST",
        body: formData
      });
      const data = await parseJsonResponse(response);

      if (!response.ok) {
        throw new Error(data.message || "Upload failed");
      }

      setFiles((current) => ({
        ...current,
        [type]: data.url
      }));
      setSelectedFiles((current) => ({
        ...current,
        [type]: null
      }));
      // Bumping the key resets the native file input after a successful upload.
      setInputVersions((current) => ({
        ...current,
        [type]: current[type] + 1
      }));
      showAlert("success", `${getTitle(type)} updated successfully`);
    } catch (error) {
      showAlert("error", error.message || "Upload failed");
    } finally {
      setUploading((current) => ({
        ...current,
        [type]: false
      }));
    }
  };

  const getTitle = (type) =>
    fileDefinitions.find((file) => file.key === type)?.title || type;

  return (
    <div className="app-shell">
      <div className="background-glow background-glow-left" />
      <div className="background-glow background-glow-right" />

      {!isLoggedIn ? (
        <main className="login-shell">
          <section className="login-card">
            <div className="brand-mark" aria-hidden="true">
              <span className="brand-mark-leaf" />
            </div>
            <p className="brand-name">bhoodhan.com</p>
            <h1>Dealer File Admin</h1>
            <p className="login-copy">
              Securely manage monthly dealer files for pricing, schemes, catalogues,
              and product details. After login, the upload manager will open with
              stable direct-download links from your own backend.
            </p>

            {alert ? (
              <div className={`alert alert-${alert.type}`} role="alert">
                <span>{alert.message}</span>
                <button type="button" className="alert-dismiss" onClick={clearAlert}>
                  Close
                </button>
              </div>
            ) : null}

            <form className="login-form" onSubmit={handleLogin}>
              <label htmlFor="password" className="field-label">
                Admin Password
              </label>
              <input
                id="password"
                className="password-input"
                type="password"
                value={draftPassword}
                onChange={(event) => setDraftPassword(event.target.value)}
                placeholder="Enter admin password"
              />
              <button type="submit" className="login-button" disabled={isAuthenticating}>
                {isAuthenticating ? "Signing in..." : "Login to Dashboard"}
              </button>
            </form>

            <div className="login-details">
              <div className="detail-pill">4 fixed file slots</div>
              <div className="detail-pill">PDF or image uploads</div>
              <div className="detail-pill">Responsive admin panel</div>
            </div>
          </section>
        </main>
      ) : (
        <main className="dashboard">
          <section className="hero-panel">
            <div className="hero-copy">
              <span className="eyebrow">bhoodhan.com</span>
              <h1>Dealer File Manager</h1>
              <p>
                Upload the latest monthly files while keeping the public links fixed
                for dealer communication and WhatsApp automation.
              </p>
            </div>

            <div className="password-panel">
              <span className="field-label">Session Status</span>
              <p className="session-copy">
                You are logged into the admin dashboard. Uploading a new file will
                overwrite the old stored file and preserve the same direct-download link.
              </p>
              <button type="button" className="logout-button" onClick={handleLogout}>
                Logout
              </button>
            </div>
          </section>

          {alert ? (
            <div className={`alert alert-${alert.type}`} role="alert">
              <span>{alert.message}</span>
              <button type="button" className="alert-dismiss" onClick={clearAlert}>
                Close
              </button>
            </div>
          ) : null}

          <section className="status-row">
            <div className="status-card">
              <span className="status-label">API Endpoint</span>
              <span className="status-value">{API_URL}</span>
            </div>
            <div className="status-card">
              <span className="status-label">File Slots</span>
              <span className="status-value">4 managed download links</span>
            </div>
          </section>

          <section className="cards-grid">
            {fileDefinitions.map((file) => {
              const selectedFile = selectedFiles[file.key];
              const isBusy = uploading[file.key];
              const link = files[file.key];

              return (
                <article key={file.key} className="file-card">
                  <div className="card-header">
                    <div>
                      <h2>{file.title}</h2>
                      <p>{file.description}</p>
                    </div>
                    <span className="card-badge">FILE</span>
                  </div>

                  <label className="field-label" htmlFor={`file-${file.key}`}>
                    Select File
                  </label>
                  <input
                    key={inputVersions[file.key]}
                    id={`file-${file.key}`}
                    className="file-input"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
                    onChange={(event) => handleFileChange(file.key, event)}
                  />

                  <div className="file-meta">
                    <span className="meta-label">Selected file</span>
                    <span className="meta-value">
                      {selectedFile ? selectedFile.name : "No file selected"}
                    </span>
                  </div>

                  <div className="link-panel">
                    <span className="meta-label">Current public link</span>
                    {isFetching ? (
                      <span className="meta-value">Loading link...</span>
                    ) : (
                      <a
                        className="file-link"
                        href={link}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {link || "Unavailable"}
                      </a>
                    )}
                  </div>

                  <button
                    type="button"
                    className="upload-button"
                    onClick={() => handleUpload(file.key)}
                    disabled={isBusy || isFetching}
                  >
                    {isBusy ? "Uploading..." : "Upload File"}
                  </button>
                </article>
              );
            })}
          </section>
        </main>
      )}
    </div>
  );
}

export default App;

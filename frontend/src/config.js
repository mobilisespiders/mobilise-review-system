const LOCAL_API_URL = "http://localhost:8000";
const PRODUCTION_API_URL = "https://lifestyle-due-barrier-wal.trycloudflare.com/";

const BASE_URL =
  process.env.REACT_APP_API_URL ||
  (process.env.NODE_ENV === "production" ? PRODUCTION_API_URL : LOCAL_API_URL);

export default BASE_URL;

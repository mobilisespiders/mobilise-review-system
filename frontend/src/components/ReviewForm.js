import React, { useState } from "react";
import axios from "axios";
import BASE_URL from "../config";

function ReviewForm() {
  const [form, setForm] = useState({
    reviewer_id: "",
    reviewee_id: "",
    rating: "",
    review_text: ""
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      await axios.post(`${BASE_URL}/submit-review/`, form);
      alert("Review submitted successfully");
    } catch (error) {
      alert(error.response?.data?.detail || "Error");
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100">
      
      <div className="bg-white p-8 rounded-2xl shadow-lg w-96">
        
        <h2 className="text-2xl font-bold mb-6 text-center">
          Submit Review
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          
          <input
            name="reviewer_id"
            placeholder="Reviewer ID"
            onChange={handleChange}
            className="w-full p-2 border rounded-lg"
          />

          <input
            name="reviewee_id"
            placeholder="Reviewee ID"
            onChange={handleChange}
            className="w-full p-2 border rounded-lg"
          />

          <input
            name="rating"
            placeholder="Rating (1-5)"
            onChange={handleChange}
            className="w-full p-2 border rounded-lg"
          />

          <textarea
            name="review_text"
            placeholder="Write your review..."
            onChange={handleChange}
            className="w-full p-2 border rounded-lg"
          />

          <button
            type="submit"
            className="w-full bg-blue-500 text-white p-2 rounded-lg hover:bg-blue-600"
          >
            Submit
          </button>

        </form>
      </div>
    </div>
  );
}

export default ReviewForm;

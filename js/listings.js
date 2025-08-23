import { db } from "../firebase/firebase-config.js";
import { collection, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";

const container = document.getElementById("businessContainer");

async function loadBusinesses() {
  container.innerHTML = "<p>Loading businesses...</p>";

  try {
    const q = query(collection(db, "businesses"), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);

    container.innerHTML = "";

    if (snapshot.empty) {
      container.innerHTML = "<p>No businesses found.</p>";
      return;
    }

    snapshot.forEach(doc => {
      const data = doc.data();

      // Safe fallback values
      const profilePic = data.profilePicURL || "https://via.placeholder.com/120";
      const bio = data.bio || "";
      const about = data.about || "";

      const card = document.createElement("div");
      card.className = "card";

      card.innerHTML = `
        <div class="card-header">
          <div>
            <h3>${data.businessType || "Business"}</h3>
            <p><strong>Owner:</strong> ${data.fullName}</p>
          </div>
          <img class="profile-pic" src="${profilePic}" alt="Profile Picture" onclick="window.open('${profilePic}', '_blank')">
        </div>

        <p><strong>Contact:</strong> ${data.contact}</p>
        <p><strong>Address:</strong> ${data.address}, ${data.pincode}</p>
        ${data.mapLink ? `<p><a href="${data.mapLink}" target="_blank">📍 View on Map</a></p>` : ""}
        ${data.price ? `<p><strong>Price:</strong> ₹${data.price}</p>` : ""}
        ${bio ? `<p><em>${bio}</em></p>` : ""}
        <p>${about}</p>

        <div class="gallery">
          ${data.imageURLs?.map(url => `<img src="${url}" alt="Business Image">`).join("") || ""}
        </div>

        ${data.videoURL ? `<video controls src="${data.videoURL}"></video>` : ""}

        <p class="meta">Added: ${data.createdAt?.toDate().toLocaleString() || ""}</p>
      `;

      container.appendChild(card);
    });
  } catch (error) {
    console.error("Error fetching businesses:", error);
    container.innerHTML = "<p>❌ Failed to load businesses.</p>";
  }
}

loadBusinesses();

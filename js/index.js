import { db, storage } from "../firebase/firebase-config.js";
import { addDoc, collection } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-storage.js";

// Disable submit initially (About is required)
document.getElementById("submitBtn").disabled = true;

// ---------------- IMAGE PREVIEW ----------------
document.getElementById("imageFiles").addEventListener("change", (e) => {
  const files = e.target.files;
  const preview = document.getElementById("imagePreview");
  preview.innerHTML = "";

  if (files.length > 4) {
    alert("You can upload a maximum of 4 images.");
    e.target.value = "";
    return;
  }

  Array.from(files).forEach(file => {
    const img = document.createElement("img");
    img.src = URL.createObjectURL(file);
    img.style.maxWidth = "100px";
    img.style.margin = "5px";
    preview.appendChild(img);
  });
});

// ---------------- VIDEO PREVIEW ----------------
document.getElementById("videoFile").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  const preview = document.getElementById("videoPreview");
  preview.innerHTML = "";

  if (file) {
    const video = document.createElement("video");
    video.controls = true;
    video.src = URL.createObjectURL(file);
    video.style.maxWidth = "200px";
    preview.appendChild(video);

    const duration = await getVideoDuration(file);
    if (duration > 35) {
      alert("Video must be max 35 seconds.");
      e.target.value = "";
      preview.innerHTML = "";
    }
  }
});

// ---------------- REAL-TIME VALIDATION ----------------
function validateInputs() {
  const phone = document.getElementById("contact").value.trim();
  const pincode = document.getElementById("pincode").value.trim();

  const phoneMsg = document.getElementById("phoneMsg");
  const pincodeMsg = document.getElementById("pincodeMsg");

  let valid = true;

  // Phone validation: 10 digits
  if (!/^\d{10}$/.test(phone)) {
    phoneMsg.textContent = "Phone must be 10 digits";
    phoneMsg.style.color = "red";
    valid = false;
  } else {
    phoneMsg.textContent = "✓ Valid";
    phoneMsg.style.color = "green";
  }

  // Pincode validation: 6 digits
  if (!/^\d{6}$/.test(pincode)) {
    pincodeMsg.textContent = "Pincode must be 6 digits";
    pincodeMsg.style.color = "red";
    valid = false;
  } else {
    pincodeMsg.textContent = "✓ Valid";
    pincodeMsg.style.color = "green";
  }

  // Word limit checks also included
  if (!checkAllWordLimits()) {
    valid = false;
  }

  document.getElementById("submitBtn").disabled = !valid;
}

// Force numeric-only for phone & pincode
["contact", "pincode"].forEach(id => {
  const input = document.getElementById(id);
  input.addEventListener("input", (e) => {
    e.target.value = e.target.value.replace(/\D/g, ""); // remove non-digits
    validateInputs();
  });
});

// ---------------- FORM SUBMIT ----------------
document.getElementById("businessForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  let bioText = document.getElementById("bio").value.trim();
  if (bioText && bioText.split(/\s+/).length > 20) {
    alert("Bio must be max 20 words.");
    return;
  }

  let aboutText = document.getElementById("about").value.trim();
  if (!aboutText) {
    alert("About section is required.");
    return;
  }
  if (aboutText.split(/\s+/).length > 100) {
    alert("About section must be max 100 words.");
    return;
  }

  const businessNameType = document.getElementById("businessNameType").value;
  const businessType = document.getElementById("businessType").value;
  const fullName = document.getElementById("fullName").value;
  const contact = document.getElementById("contact").value;
  const address = document.getElementById("address").value;
  const pincode = document.getElementById("pincode").value;
  const mapLink = document.getElementById("mapLink").value || null;
  const price = document.getElementById("price").value || null;

  let imageURLs = [];
  let videoURL = null;

  try {
    // Upload images
    const images = document.getElementById("imageFiles").files;
    for (let file of images) {
      const storageRef = ref(storage, "business_images/" + Date.now() + "_" + file.name);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);
      imageURLs.push(downloadURL);
    }

    // Upload video
    const videoFile = document.getElementById("videoFile").files[0];
    if (videoFile) {
      const duration = await getVideoDuration(videoFile);
      if (duration > 35) {
        alert("Video must be max 35 seconds.");
        return;
      }
      const videoRef = ref(storage, "business_videos/" + Date.now() + "_" + videoFile.name);
      await uploadBytes(videoRef, videoFile);
      videoURL = await getDownloadURL(videoRef);
    }

    // Save Firestore doc
    await addDoc(collection(db, "business_listings"), {
      businessNameType,
      businessType,
      images: imageURLs,
      video: videoURL,
      fullName,
      bio: bioText,
      about: aboutText,
      contact,
      address,
      pincode,
      mapLink,
      price,
      createdAt: new Date()
    });

    alert("Business added successfully!");
    document.getElementById("businessForm").reset();
    document.getElementById("imagePreview").innerHTML = "";
    document.getElementById("videoPreview").innerHTML = "";
    document.getElementById("phoneMsg").textContent = "";
    document.getElementById("pincodeMsg").textContent = "";
    document.getElementById("submitBtn").disabled = true;

  } catch (error) {
    console.error("Error adding document: ", error);
    alert("Failed to add business. Check console for details.");
  }
});

// ---------------- HELPERS ----------------
function getVideoDuration(file) {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => resolve(video.duration);
    video.src = URL.createObjectURL(file);
  });
}

function setupWordCounter(inputId, counterId, maxWords, required = false) {
  const input = document.getElementById(inputId);
  const counter = document.getElementById(counterId);

  function updateCounter() {
    const words = input.value.trim().split(/\s+/).filter(w => w.length > 0);
    const count = words.length;

    counter.textContent = `${count} / ${maxWords} words`;

    if (count > maxWords || (required && count === 0)) {
      counter.style.color = "red";
    } else {
      counter.style.color = "green";
    }
    validateInputs();
  }

  updateCounter();
  input.addEventListener("input", updateCounter);
}

function checkAllWordLimits() {
  const bioWords = document.getElementById("bio").value.trim().split(/\s+/).filter(w => w.length > 0).length;
  const aboutWords = document.getElementById("about").value.trim().split(/\s+/).filter(w => w.length > 0).length;
  return bioWords <= 20 && aboutWords > 0 && aboutWords <= 100;
}

// Initialize counters
setupWordCounter("bio", "bioCounter", 20);
setupWordCounter("about", "aboutCounter", 100, true);

// uploading inputs
const form = document.getElementById("businessForm");
const submitBtn = document.getElementById("submitBtn");
const statusBox = document.getElementById("statusBox");
const statusMessage = document.getElementById("statusMessage");
const spinner = document.getElementById("spinner");

let isSubmitting = false;

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (isSubmitting) return;
  isSubmitting = true;

  // --- Word Limits ---
  let bioText = document.getElementById("bio").value.trim();
  if (bioText && bioText.split(/\s+/).length > 20) {
    alert("Bio must be max 20 words.");
    isSubmitting = false;
    return;
  }

  let aboutText = document.getElementById("about").value.trim();
  if (!aboutText) {
    alert("About section is required.");
    isSubmitting = false;
    return;
  }
  if (aboutText.split(/\s+/).length > 100) {
    alert("About must be max 100 words.");
    isSubmitting = false;
    return;
  }

  // --- Profile Picture (mandatory) ---
  const profilePicFile = document.getElementById("profilePic").files[0];
  if (!profilePicFile) {
    alert("Profile picture is required!");
    isSubmitting = false;
    return;
  }

  // Show status UI
  statusBox.style.display = "flex";
  spinner.style.display = "block";
  submitBtn.disabled = true;
  submitBtn.textContent = "Uploading...";
  statusMessage.textContent = "Uploading files...";

  try {
    // --- Upload Profile Picture ---
    const profileRef = ref(storage, "profile_pics/" + Date.now() + "_" + profilePicFile.name);
    await uploadBytes(profileRef, profilePicFile);
    const profilePicURL = await getDownloadURL(profileRef);

    // --- Upload Images (max 4) ---
    const imageFiles = document.getElementById("imageFiles").files;
    if (imageFiles.length > 4) {
      alert("You can upload a maximum of 4 images.");
      isSubmitting = false;
      return;
    }

    const imageUploadPromises = Array.from(imageFiles).map(async (file) => {
      const storageRef = ref(storage, "business_images/" + Date.now() + "_" + file.name);
      await uploadBytes(storageRef, file);
      return getDownloadURL(storageRef);
    });
    const imageURLs = await Promise.all(imageUploadPromises);

    // --- Upload Video (max 35s) ---
    let videoURL = null;
    const videoFile = document.getElementById("videoFile").files[0];
    if (videoFile) {
      const duration = await getVideoDuration(videoFile);
      if (duration > 35) {
        alert("Video must be max 35 seconds.");
        isSubmitting = false;
        return;
      }
      const videoRef = ref(storage, "business_videos/" + Date.now() + "_" + videoFile.name);
      await uploadBytes(videoRef, videoFile);
      videoURL = await getDownloadURL(videoRef);
    }

    // --- Save Firestore Document ---
    await addDoc(collection(db, "businesses"), {
      businessNameType: document.getElementById("businessNameType").value,
      businessType: document.getElementById("businessType").value,
      bio: bioText || null,
      about: aboutText,
      fullName: document.getElementById("fullName").value,
      contact: document.getElementById("contact").value,
      address: document.getElementById("address").value,
      pincode: document.getElementById("pincode").value,
      mapLink: document.getElementById("mapLink").value || null,
      price: document.getElementById("price").value || null,
      profilePicURL,   // ✅ new field
      imageURLs,
      videoURL,
      createdAt: new Date()
    });

    statusMessage.textContent = "✅ Registration successful!";
    statusMessage.style.color = "green";
    spinner.style.display = "none";

    setTimeout(() => {
      statusBox.style.display = "none";
      statusMessage.textContent = "";
    }, 5000);

    form.reset();
    document.getElementById("imagePreview").innerHTML = "";
    document.getElementById("videoPreview").innerHTML = "";
    document.getElementById("submitBtn").disabled = true;

  } catch (error) {
    console.error("Error:", error);
    statusMessage.textContent = "❌ Failed to submit. Please try again.";
    statusMessage.style.color = "red";
    spinner.style.display = "none";
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Submit";
    isSubmitting = false;
  }
});

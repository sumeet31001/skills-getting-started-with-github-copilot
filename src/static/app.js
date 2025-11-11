document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Helper: make a friendly name from email (before @) and initials
  function friendlyNameFromEmail(email) {
    const local = email.split("@")[0];
    const parts = local.split(/[\.\-_]/).filter(Boolean);
    const name = parts.map((p) => p[0].toUpperCase() + p.slice(1)).join(" ");
    const initials = parts.length
      ? parts.slice(0, 2).map((p) => p[0].toUpperCase()).join("")
      : local.slice(0, 2).toUpperCase();
    return { name: name || local, initials };
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message / previous cards
      activitiesList.innerHTML = "";

      // Clear options and keep the placeholder
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        // Build participants section
        let participantsHTML = "";
        if (details.participants && details.participants.length > 0) {
          participantsHTML = `<div class="participants">
            <strong>Participants</strong>
            <ul class="participants-list">
              ${details.participants
                .map((p) => {
                  const { name: friendly, initials } = friendlyNameFromEmail(p);
                  // Include a small delete button next to each participant. Data attributes
                  // will be used to identify the participant when the button is clicked.
                  return `<li class="participant-item" data-email="${p}"><span class="avatar">${initials}</span><span class="participant-name" title="${p}">${friendly}</span><button class="participant-delete" data-email="${p}" aria-label="Unregister ${p}">×</button></li>`;
                })
                .join("")}
            </ul>
          </div>`;
        } else {
          participantsHTML = `<div class="participants"><strong>Participants</strong><p class="muted">No participants yet</p></div>`;
        }

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          ${participantsHTML}
        `;

        activitiesList.appendChild(activityCard);

        // Attach click handlers for unregister/delete buttons for this activity card
        activityCard.querySelectorAll('.participant-delete').forEach((btn) => {
          btn.addEventListener('click', async (e) => {
            e.preventDefault();
            const email = btn.dataset.email;
            if (!email) return;

            try {
              const res = await fetch(`/activities/${encodeURIComponent(name)}/unregister?email=${encodeURIComponent(email)}`, { method: 'DELETE' });
              const result = await res.json();
              if (res.ok) {
                messageDiv.textContent = result.message;
                messageDiv.className = 'success';
                // Refresh the activities list so the UI updates immediately
                fetchActivities();
              } else {
                messageDiv.textContent = result.detail || 'Failed to unregister participant';
                messageDiv.className = 'error';
              }
              messageDiv.classList.remove('hidden');
              setTimeout(() => messageDiv.classList.add('hidden'), 5000);
            } catch (err) {
              console.error('Error unregistering participant:', err);
              messageDiv.textContent = 'Failed to unregister. Please try again.';
              messageDiv.className = 'error';
              messageDiv.classList.remove('hidden');
              setTimeout(() => messageDiv.classList.add('hidden'), 5000);
            }
          });
        });

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();

        // Optimistically update the UI so the new participant appears immediately
        try {
          // Find the activity card for this activity and append the new participant
          const cards = Array.from(document.querySelectorAll('.activity-card'));
          const targetCard = cards.find(c => {
            const h4 = c.querySelector('h4');
            return h4 && h4.textContent.trim() === activity;
          });

          if (targetCard) {
            // If there's a 'no participants' muted paragraph, replace it with a list
            const participantsSection = targetCard.querySelector('.participants');
            if (participantsSection) {
              const list = participantsSection.querySelector('.participants-list');
              if (list) {
                // Create a new participant item DOM node
                const { name: friendly, initials } = friendlyNameFromEmail(email);
                const li = document.createElement('li');
                li.className = 'participant-item';
                li.dataset.email = email;

                const avatar = document.createElement('span');
                avatar.className = 'avatar';
                avatar.textContent = initials;

                const pname = document.createElement('span');
                pname.className = 'participant-name';
                pname.title = email;
                pname.textContent = friendly;

                const del = document.createElement('button');
                del.className = 'participant-delete';
                del.dataset.email = email;
                del.setAttribute('aria-label', `Unregister ${email}`);
                del.textContent = '×';

                // Attach delete handler
                del.addEventListener('click', async (e) => {
                  e.preventDefault();
                  try {
                    const res = await fetch(`/activities/${encodeURIComponent(activity)}/unregister?email=${encodeURIComponent(email)}`, { method: 'DELETE' });
                    const r = await res.json();
                    if (res.ok) {
                      messageDiv.textContent = r.message;
                      messageDiv.className = 'success';
                      // remove the item from DOM immediately
                      li.remove();
                    } else {
                      messageDiv.textContent = r.detail || 'Failed to unregister participant';
                      messageDiv.className = 'error';
                    }
                    messageDiv.classList.remove('hidden');
                    setTimeout(() => messageDiv.classList.add('hidden'), 5000);
                  } catch (err) {
                    console.error('Error unregistering participant:', err);
                    messageDiv.textContent = 'Failed to unregister. Please try again.';
                    messageDiv.className = 'error';
                    messageDiv.classList.remove('hidden');
                    setTimeout(() => messageDiv.classList.add('hidden'), 5000);
                  }
                });

                li.appendChild(avatar);
                li.appendChild(pname);
                li.appendChild(del);
                list.appendChild(li);
              } else {
                // No list exists (no participants before). Replace muted paragraph with a list
                const muted = participantsSection.querySelector('.muted');
                const newHTML = document.createElement('ul');
                newHTML.className = 'participants-list';
                const { name: friendly, initials } = friendlyNameFromEmail(email);
                newHTML.innerHTML = `<li class="participant-item" data-email="${email}"><span class="avatar">${initials}</span><span class="participant-name" title="${email}">${friendly}</span><button class="participant-delete" data-email="${email}" aria-label="Unregister ${email}">×</button></li>`;
                if (muted) muted.replaceWith(newHTML);
                else participantsSection.appendChild(newHTML);

                // Attach handler for the newly inserted button
                const newBtn = participantsSection.querySelector('.participant-delete');
                if (newBtn) {
                  newBtn.addEventListener('click', async (e) => {
                    e.preventDefault();
                    const emailFromBtn = newBtn.dataset.email;
                    try {
                      const res = await fetch(`/activities/${encodeURIComponent(activity)}/unregister?email=${encodeURIComponent(emailFromBtn)}`, { method: 'DELETE' });
                      const r = await res.json();
                      if (res.ok) {
                        messageDiv.textContent = r.message;
                        messageDiv.className = 'success';
                        // Refresh full list to keep UI consistent
                        fetchActivities();
                      } else {
                        messageDiv.textContent = r.detail || 'Failed to unregister participant';
                        messageDiv.className = 'error';
                      }
                      messageDiv.classList.remove('hidden');
                      setTimeout(() => messageDiv.classList.add('hidden'), 5000);
                    } catch (err) {
                      console.error('Error unregistering participant:', err);
                    }
                  });
                }
              }
            }
          }
        } catch (domErr) {
          console.error('Error updating DOM after signup:', domErr);
        }

        // Finally refresh activities so participants list updates from server-of-record
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});

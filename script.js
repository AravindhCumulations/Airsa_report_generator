// Google Sheet CSV URLs (published)
const INDUSTRY_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQgrfaHxtRg4QtJoou7aFJAjuuhVqfKGBJzOPQ0mWRBRCq_zfm6PmvnaAaowzKe99DGI45rykSD5rzs/pub?gid=1730428013&single=true&output=csv"
const COMPANY_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQgrfaHxtRg4QtJoou7aFJAjuuhVqfKGBJzOPQ0mWRBRCq_zfm6PmvnaAaowzKe99DGI45rykSD5rzs/pub?gid=0&single=true&output=csv"

// API URLs
const GENERATE_REPORT_API_URL = "http://35.184.50.162:7860/api/v1/run/a70bcefd-9035-4e98-ae26-cd98363e2438?stream=false"
const SEND_EMAIL_API_URL = "http://35.184.50.162:7860/api/v1/run/24f18421-8b69-4ed6-b98d-39c5ae2404b5?stream=false"
const GENERATE_PDF_REPORT = "http://35.184.50.162:7860/api/v1/run/5e838d3e-86d4-4308-b251-4786cd6310aa?stream=false"

// Default email template
const DEFAULT_EMAIL_TEMPLATE = `Write a short (5-7 lines), high-impact email to [Prospect Name], [Designation] at [Company].

Opener (credibility): Introduce yourself as Gyan Gupta (ex-CEO, Dainik Bhaskar) and advisor to FMCG/ {that industry} CXOs.

Methodology mention: Reference your proprietary AIRSA framework and its typical 20–30% efficiency gains.

Context (report insight): Cite a specific fact from their latest annual report—e.g., 'I saw [Program/Initiative] covers [X factories/warehouses/users].'

Pain (sector challenge): State the common blocker you hear from peers in their domain.

Peer wins: Mention benchmarks ("CEOs I advise pilot 2–3 AI use cases to drive ~20% forecast accuracy gains…").

Ask (call): Request a 15-minute call to discuss "2 tailored AI quick wins."

Sign-off: Your name, email (gyan@aiin-action.ai) and mobile (+91 98118 50284).

From the input send mails to all the emails that are given in list`

// DOM elements
const fetchIndustryBtn = document.getElementById("fetchIndustryBtn")
const industryLoading = document.getElementById("industryLoading")
const industrySelectContainer = document.getElementById("industrySelectContainer")
const industrySelect = document.getElementById("industrySelect")
const fetchCompaniesBtn = document.getElementById("fetchCompaniesBtn")
const companyLoading = document.getElementById("companyLoading")
const companyContainer = document.getElementById("companyContainer")
const companyList = document.getElementById("companyList")
const generateReportBtn = document.getElementById("generateReportBtn")
const reportLoading = document.getElementById("reportLoading")
const selectedCount = document.getElementById("selectedCount")
const reportContainer = document.getElementById("reportContainer")
const reportContent = document.getElementById("reportContent")
const noCompanyMessage = document.getElementById("noCompanyMessage")

// CSV Parsing helpers
function parseCSV(csvText) {
  const rows = []
  const lines = csvText.trim().split("\n")
  const headers = parseCSVRow(lines[0])

  for (let i = 1; i < lines.length; i++) {
    const row = parseCSVRow(lines[i])
    const obj = {}
    headers.forEach((h, j) => {
      obj[h] = row[j] || ""
    })
    rows.push(obj)
  }

  return rows
}

function parseCSVRow(row) {
  const result = []
  let insideQuote = false
  let value = ""

  for (let i = 0; i < row.length; i++) {
    const char = row[i]
    const nextChar = row[i + 1]

    if (char === '"' && insideQuote && nextChar === '"') {
      value += '"'
      i++ // skip escaped quote
    } else if (char === '"') {
      insideQuote = !insideQuote
    } else if (char === "," && !insideQuote) {
      result.push(value.trim())
      value = ""
    } else {
      value += char
    }
  }

  result.push(value.trim())
  return result
}

// State
let currentCompanies = []
const selectedCompanies = new Set()
let companyReportCache = []
const industryMap = new Map()

// Fetch industry list
fetchIndustryBtn.addEventListener("click", async () => {
  try {
    industryLoading.classList.remove("hidden")
    fetchIndustryBtn.disabled = true

    const res = await fetch(INDUSTRY_CSV_URL)
    const text = await res.text()
    const data = parseCSV(text)

    industrySelect.innerHTML = '<option value="">-- Select Industry --</option>'
    industryMap.clear()

    data.forEach((row) => {
      const opt = document.createElement("option")
      opt.value = row.industry_id
      opt.textContent = row.industry_name
      industrySelect.appendChild(opt)
      industryMap.set(row.industry_id, row.industry_name)
    })

    industrySelectContainer.classList.remove("hidden")
  } catch (err) {
    showToast("Failed to fetch industries: " + err.message, "error")
  } finally {
    industryLoading.classList.add("hidden")
    fetchIndustryBtn.disabled = false
  }
})

function showToast(message, type = "error") {
  const toast = document.createElement("div")
  toast.className = `toast toast-${type}`
  toast.textContent = message

  document.getElementById("toastContainer").appendChild(toast)

  setTimeout(() => {
    toast.remove()
  }, 3000)
}

// Fetch companies from Sheet1 based on selected industry
fetchCompaniesBtn.addEventListener("click", async () => {
  const industryId = industrySelect.value
  const industryName = industryMap.get(industryId)
  currentCompanies = []
  selectedCompanies.clear()

  if (!industryId || !industryName) return showToast("Select industry first", "error")

  try {
    companyLoading.classList.remove("hidden")
    fetchCompaniesBtn.disabled = true
    noCompanyMessage.classList.add("hidden")

    const res = await fetch(COMPANY_CSV_URL)
    const text = await res.text()
    const data = parseCSV(text)

    const companies = data.filter((row) => row.industry_id === industryId)
    currentCompanies = companies

    renderCompanies()
    companyContainer.classList.remove("hidden")

    // Hide report section
    reportContainer.classList.add("hidden")
  } catch (err) {
    showToast("Failed to fetch company data: " + err.message, "error")
    
  } finally {
    companyLoading.classList.add("hidden")
    fetchCompaniesBtn.disabled = false
  }
})

// Render companies with checkboxes
function renderCompanies() {
  companyList.innerHTML = ""

  currentCompanies.forEach((company) => {
    const div = document.createElement("div")
    div.className = "company-card"
    div.innerHTML = `
      <input type="checkbox" class="company-checkbox" data-company="${company.company_name}" 
             ${selectedCompanies.has(company.company_name) ? "checked" : ""}>
      <h3>${company.company_name}</h3>
      <p><strong>Industry:</strong> ${company.industry_name}</p>
      <p><strong>Industry ID:</strong> ${company.industry_id}</p>
      <p><a href="${company.company_url}" target="_blank">View Company</a></p>
      ${company.pdf_url ? `<p><a href="${company.pdf_url}" target="_blank">View PDF</a></p>` : ""}
    `

    // Add event listener for checkbox
    const checkbox = div.querySelector(".company-checkbox")
    checkbox.addEventListener("change", (e) => {
      const companyName = e.target.dataset.company
      if (e.target.checked) {
        selectedCompanies.add(companyName)
        div.classList.add("selected")
      } else {
        selectedCompanies.delete(companyName)
        div.classList.remove("selected")
      }
      updateSelectedCount()
    })

    if (selectedCompanies.has(company.company_name)) {
      div.classList.add("selected")
    }

    companyList.appendChild(div)
  })

  updateSelectedCount()
}

// Update selected count display
function updateSelectedCount() {
  if (selectedCompanies.size > 0) {
    selectedCount.textContent = `${selectedCompanies.size} companies selected`
    selectedCount.classList.remove("hidden")
    generateReportBtn.classList.remove("hidden")
    generateReportBtn.querySelector("span").textContent = `Generate AIRSA Report (${selectedCompanies.size} companies)`
  } else {
    selectedCount.classList.add("hidden")
    generateReportBtn.classList.add("hidden")
  }
}

// Generate AIRSA Report
generateReportBtn.addEventListener("click", async () => {
  if (selectedCompanies.size === 0) return

  try {
    reportLoading.classList.remove("hidden")
    generateReportBtn.disabled = true
    const selectedCompanyData = currentCompanies.filter((company) => selectedCompanies.has(company.company_name))

    const reports = []

    for (const company of selectedCompanyData) {
      const payload = JSON.stringify({ value: company })

      const reqBody = {
        output_type: "chat",
        input_type: "chat",
        tweaks: {
          "ChatInput-ysKIY": { input_value: payload },
        },
      }

      const response = await fetch(GENERATE_REPORT_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reqBody),
      })

      const data = await response.json()
      const message = data?.outputs?.[0]?.outputs?.[0]?.messages?.[0]?.message
      const reportData = JSON.parse(message)

      // Generate PDF with proper error handling
      let pdfLink = null
      let pdfError = null

      try {
        const reqBodyPdf = {
          output_type: "chat",
          input_type: "chat",
          tweaks: {
            "ChatInput-ZPAgf": { input_value: payload },
          },
        }

        const responsePdf = await fetch(GENERATE_PDF_REPORT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(reqBodyPdf),
        })

        if (!responsePdf.ok) {
          throw new Error(`PDF API returned ${responsePdf.status}: ${responsePdf.statusText}`)
        }

        const dataPdf = await responsePdf.json()

        // Check if response has expected structure
        if (!dataPdf?.outputs?.[0]?.outputs?.[0]?.messages?.[0]?.message) {
          throw new Error("Invalid PDF API response structure")
        }

        const pdfMessage = dataPdf.outputs[0].outputs[0].messages[0].message

        // Check if message contains error indicators
        if (
          pdfMessage.toLowerCase().includes("error") ||
          pdfMessage.toLowerCase().includes("failed") ||
          pdfMessage.toLowerCase().includes("exception")
        ) {
          throw new Error(`PDF generation failed: ${pdfMessage}`)
        }

        // Extract PDF URL
        const urlMatch = pdfMessage.match(/https?:\/\/[^\s"]+/)
        if (!urlMatch) {
          throw new Error("No valid PDF URL found in response")
        }

        pdfLink = urlMatch[0]
        
      } catch (error) {
        pdfError = error.message
        showToast(`PDF generation failed for ${company.company_name}: ${error.message}`)

        // // Show user notification (you can customize this)
        // if (
        //   window.confirm(`PDF generation failed for ${company.company_name}: ${error.message}\n\nContinue without PDF?`)
        // ) {
        //   // Continue with report generation
        // } else {
        //   // Skip this company or abort
        //   continue // Skip to next company
        // }
      }

      reports.push({
        companyName: company.company_name,
        reportData,
        pdfLink,
        pdfError, // Include error info
        emails: reportData.emails || [],
      })
    }

    companyReportCache = reports
    renderCompanyTabs(reports)
  } catch (err) {
    showToast("Failed to generate reports: " + err.message)
  } finally {
    reportLoading.classList.add("hidden")
    generateReportBtn.disabled = false
  }
})

function renderCompanyTabs(reports) {
  document.getElementById("reportContainer").classList.remove("hidden")

  reportContent.innerHTML = `
    <div class="tabs">
      <ul class="tab-header">
        ${reports
          .map(
            (r, i) => `
          <li data-tab="${i}" class="${i === 0 ? "active" : ""}">${r.companyName}</li>
        `,
          )
          .join("")}
      </ul>
      <div class="tab-body">
        ${reports
          .map(
            (r, i) => `
          <div class="tab-content ${i === 0 ? "active" : ""}" data-tab="${i}">
            <h3>${r.companyName} Report</h3>
            
            ${
              r.pdfLink
                ? `<a href="${r.pdfLink}" target="_blank" class="pdf-link">
         <i class="fas fa-file-pdf"></i> View PDF Report
       </a>`
                : r.pdfError
                  ? `<div class="pdf-error">
         <i class="fas fa-exclamation-triangle"></i> 
         PDF Generation Failed: ${r.pdfError}
         <button onclick="retryPdfGeneration(${i})" class="btn btn-small primary" style="margin-left: 10px;">
           Retry PDF
         </button>
       </div>`
                  : `<div class="pdf-warning">
         <i class="fas fa-info-circle"></i> 
         No PDF available for this report
       </div>`
            }
            
            <div class="email-section">
              <h4>Email Recipients</h4>
              <div class="email-add-section">
                <div class="email-input-group">
                  <input type="email" id="newEmail-${i}" placeholder="Enter new email address" class="email-input">
                  <button onclick="addNewEmail(${i})" class="btn primary btn-small">Add Email</button>
                </div>
                <div id="emailAddResult-${i}" class="email-add-result hidden"></div>
              </div>
              
              <div class="email-list" id="emailList-${i}">
                ${r.emails
                  .map(
                    (email) => `
                  <div class="email-item">
                    <input type="checkbox" id="email-${i}-${email}" data-email="${email}" checked>
                    <label for="email-${i}-${email}">${email}</label>
                  </div>
                `,
                  )
                  .join("")}
              </div>
              
              <h4>Email Message</h4>
              <textarea id="emailPrompt-${i}" class="email-prompt" placeholder="Write your email prompt here...">${DEFAULT_EMAIL_TEMPLATE}</textarea>
              
              <div class="send-email-section">
                <button onclick="sendEmailForCompany(${i})" class="btn primary" id="sendBtn-${i}">
                  <span>Send Email to ${r.emails.length} recipient${r.emails.length !== 1 ? "s" : ""}</span>
                  <div id="emailLoading-${i}" class="loader hidden"></div>
                </button>
                <div id="emailStatus-${i}" class="email-status hidden"></div>
              </div>
            </div>
          </div>
        `,
          )
          .join("")}
      </div>
    </div>
  `

  // Tab switching functionality
  document.querySelectorAll(".tab-header li").forEach((tab) => {
    tab.addEventListener("click", () => {
      const tabId = tab.dataset.tab
      document.querySelectorAll(".tab-header li").forEach((t) => t.classList.remove("active"))
      document.querySelectorAll(".tab-content").forEach((t) => t.classList.remove("active"))
      tab.classList.add("active")
      document.querySelector(`.tab-content[data-tab="${tabId}"]`).classList.add("active")
    })
  })

  // Add event listeners for email checkboxes
  reports.forEach((report, index) => {
    const emailCheckboxes = document.querySelectorAll(`#emailList-${index} input[type="checkbox"]`)
    emailCheckboxes.forEach((checkbox) => {
      checkbox.addEventListener("change", () => updateSendButton(index))
    })
  })
}

function addNewEmail(companyIndex) {
  const newEmailInput = document.getElementById(`newEmail-${companyIndex}`)
  const emailAddResult = document.getElementById(`emailAddResult-${companyIndex}`)
  const emailList = document.getElementById(`emailList-${companyIndex}`)
  const email = newEmailInput.value.trim()

  // Simple email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  if (!email) {
    showEmailAddResult(companyIndex, "Please enter an email address", "error")
    return
  }

  if (!emailRegex.test(email)) {
    showEmailAddResult(companyIndex, "Please enter a valid email address", "error")
    return
  }

  // Check if email already exists
  const existingEmails = Array.from(document.querySelectorAll(`#emailList-${companyIndex} input[data-email]`)).map(
    (input) => input.dataset.email,
  )

  if (existingEmails.includes(email)) {
    showEmailAddResult(companyIndex, "This email is already in the list", "error")
    return
  }

  // Add the new email
  const newEmailItem = document.createElement("div")
  newEmailItem.className = "email-item"
  newEmailItem.innerHTML = `
    <input type="checkbox" id="email-${companyIndex}-${email}" data-email="${email}" checked>
    <label for="email-${companyIndex}-${email}">${email}</label>
  `

  // Add event listener to the new checkbox
  const checkbox = newEmailItem.querySelector('input[type="checkbox"]')
  checkbox.addEventListener("change", () => updateSendButton(companyIndex))

  emailList.appendChild(newEmailItem)

  // Clear the input
  newEmailInput.value = ""

  // Show success message
  showEmailAddResult(companyIndex, "Email added successfully", "success")

  // Update send button
  updateSendButton(companyIndex)
}

function showEmailAddResult(companyIndex, message, type) {
  const emailAddResult = document.getElementById(`emailAddResult-${companyIndex}`)
  emailAddResult.textContent = message
  emailAddResult.className = `email-add-result ${type === "success" ? "success-message" : "error-message"}`
  emailAddResult.classList.remove("hidden")

  // Hide the message after 3 seconds
  setTimeout(() => {
    emailAddResult.classList.add("hidden")
  }, 3000)
}

function updateSendButton(companyIndex) {
  const checkedEmails = document.querySelectorAll(`#emailList-${companyIndex} input[type="checkbox"]:checked`)
  const sendBtn = document.getElementById(`sendBtn-${companyIndex}`)
  const count = checkedEmails.length

  sendBtn.querySelector("span").textContent = `Send Email to ${count} recipient${count !== 1 ? "s" : ""}`
  sendBtn.disabled = count === 0
}

async function sendEmailForCompany(index) {
  const report = companyReportCache[index]
  const prompt = document.getElementById(`emailPrompt-${index}`).value
  const emailLoading = document.getElementById(`emailLoading-${index}`)
  const emailStatus = document.getElementById(`emailStatus-${index}`)
  const sendBtn = document.getElementById(`sendBtn-${index}`)

  // Get selected emails
  const selectedEmailInputs = document.querySelectorAll(`#emailList-${index} input[type="checkbox"]:checked`)
  const selectedEmails = Array.from(selectedEmailInputs).map((input) => input.dataset.email)

  if (selectedEmails.length === 0) {
    emailStatus.textContent = "Please select at least one email recipient"
    emailStatus.className = "email-status error"
    emailStatus.classList.remove("hidden")
    return
  }

  try {
    emailLoading.classList.remove("hidden")
    sendBtn.disabled = true
    emailStatus.classList.add("hidden")

    const payload = JSON.stringify({
      emails: selectedEmails,
      message: prompt,
      companyName: report.companyName,
      attachPdf: report.pdfLink ? true : false, // Only attach if PDF exists
      pdfLink: report.pdfLink || null,
    })

    const reqBody = {
      output_type: "chat",
      input_type: "chat",
      tweaks: {
        "ChatInput-zzkkC": { input_value: payload },
      },
    }

    const response = await fetch(SEND_EMAIL_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(reqBody),
    })

    if (response.ok) {
      emailStatus.textContent = `✅ Email sent successfully to ${selectedEmails.length} recipient${selectedEmails.length !== 1 ? "s" : ""} for ${report.companyName}`
      emailStatus.className = "email-status success"
    } else {
      throw new Error(`HTTP ${response.status}`)
    }
  } catch (error) {
    emailStatus.textContent = `❌ Failed to send email for ${report.companyName}: ${error.message}`
    emailStatus.className = "email-status error"
  } finally {
    emailLoading.classList.add("hidden")
    sendBtn.disabled = false
    emailStatus.classList.remove("hidden")
  }
}

async function retryPdfGeneration(companyIndex) {
  const report = companyReportCache[companyIndex]
  const payload = JSON.stringify({ value: currentCompanies.find(c => c.company_name === report.companyName) })

  const tabContent = document.querySelector(`.tab-content[data-tab="${companyIndex}"]`)
  const retryButton = tabContent.querySelector("button")
  retryButton.disabled = true
  retryButton.textContent = "Retrying..."

  try {
    const reqBodyPdf = {
      output_type: "chat",
      input_type: "chat",
      tweaks: {
        "ChatInput-ZPAgf": { input_value: payload },
      },
    }

    const responsePdf = await fetch(GENERATE_PDF_REPORT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(reqBodyPdf),
    })

    if (!responsePdf.ok) throw new Error(`HTTP ${responsePdf.status}`)

    const dataPdf = await responsePdf.json()
    const pdfMessage = dataPdf.outputs?.[0]?.outputs?.[0]?.messages?.[0]?.message || ""

    if (
      pdfMessage.toLowerCase().includes("error") ||
      pdfMessage.toLowerCase().includes("failed") ||
      pdfMessage.toLowerCase().includes("exception")
    ) {
      throw new Error(`PDF generation failed: ${pdfMessage}`)
    }

    const urlMatch = pdfMessage.match(/https?:\/\/[^\s"]+/)
    if (!urlMatch) throw new Error("No valid PDF URL found")

    const pdfLink = urlMatch[0]
    report.pdfLink = pdfLink
    report.pdfError = null

    // Replace existing PDF section with new link
    const pdfSection = tabContent.querySelector(".pdf-error") || tabContent.querySelector(".pdf-warning")
    pdfSection.outerHTML = `
      <a href="${pdfLink}" target="_blank" class="pdf-link">
        <i class="fas fa-file-pdf"></i> View PDF Report
      </a>
    `
  } catch (error) {
    report.pdfError = error.message
    const pdfSection = tabContent.querySelector(".pdf-error") || tabContent.querySelector(".pdf-warning")
    pdfSection.innerHTML = `
      <div class="pdf-error">
        <i class="fas fa-exclamation-triangle"></i>
        PDF Retry Failed: ${error.message}
        <button onclick="retryPdfGeneration(${companyIndex})" class="btn btn-small primary" style="margin-left: 10px;">
          Retry PDF
        </button>
      </div>
    `
  } finally {
    retryButton.disabled = false
    retryButton.textContent = "Retry PDF"
  }
}

// Make functions globally available
window.addNewEmail = addNewEmail
window.sendEmailForCompany = sendEmailForCompany
window.retryPdfGeneration = retryPdfGeneration

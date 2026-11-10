const transactionForm = document.getElementById("transactionForm");
const transactionType = document.getElementById("transactionType");
const transactionTitle = document.getElementById("transactionTitle");
const transactionAmount = document.getElementById("transactionAmount");
const transactionCategory = document.getElementById("transactionCategory");
const transactionDate = document.getElementById("transactionDate");

const totalBalance = document.getElementById("totalBalance");
const totalIncome = document.getElementById("totalIncome");
const totalExpenses = document.getElementById("totalExpenses");
const transactionList = document.getElementById("transactionList");
const transactionCount = document.getElementById("transactionCount");
const formMessage = document.getElementById("formMessage");
const selectedMonth = document.getElementById("selectedMonth");
// Budget elements
const budgetAmount = document.getElementById("budgetAmount");
const saveBudgetButton = document.getElementById("saveBudgetButton");
const budgetTotal = document.getElementById("budgetTotal");
const budgetSpent = document.getElementById("budgetSpent");
const budgetRemaining = document.getElementById("budgetRemaining");
const budgetProgressBar = document.getElementById("budgetProgressBar");
const budgetMessage = document.getElementById("budgetMessage");

// References to our chart canvases.
const expenseChartCanvas = document.getElementById("expenseChart");
const monthlyChartCanvas = document.getElementById("monthlyChart");

// Keep chart instances so we can update them.
let expenseChart = null;
let monthlyChart = null;

// Load saved transactions when the page opens.
let transactions = loadTransactions();

const categoryIcons = {
  Food: "🍽️",
  Transport: "🚌",
  Shopping: "🛍️",
  Bills: "🧾",
  Education: "📚",
  Health: "💊",
  Entertainment: "🎬",
  Salary: "💼",
  Freelance: "💻",
  Other: "💰",
};

// Load transactions from LocalStorage.
function loadTransactions() {
  try {
    const savedTransactions = localStorage.getItem("expenseWiseTransactions");

    const parsedTransactions = savedTransactions
      ? JSON.parse(savedTransactions)
      : [];

    if (!Array.isArray(parsedTransactions)) {
      return [];
    }

    return parsedTransactions.filter(
      (item) =>
        item &&
        typeof item.id === "string" &&
        typeof item.title === "string" &&
        item.title.trim().length > 0 &&
        ["income", "expense"].includes(item.type) &&
        Number.isFinite(item.amount) &&
        item.amount > 0 &&
        item.amount <= 1000000000 &&
        typeof item.category === "string" &&
        typeof item.date === "string" &&
        /^\d{4}-\d{2}-\d{2}$/.test(item.date) &&
        Number.isFinite(Date.parse(item.date + "T00:00:00")) &&
        Date.parse(item.date + "T00:00:00") <= Date.now() &&
        new Date(Date.parse(item.date + "T00:00:00"))
          .toISOString()
          .slice(0, 10) === item.date,
    );
  } catch (error) {
    console.error("Could not load saved transactions:", error);
    return [];
  }
}

// Save transactions in LocalStorage.
function saveTransactions() {
  try {
    localStorage.setItem(
      "expenseWiseTransactions",
      JSON.stringify(transactions),
    );

    return true;
  } catch (error) {
    console.error("Could not save transactions:", error);

    formMessage.textContent =
      "Could not save data. Check your browser storage.";

    return false;
  }
}

// Format amounts into Indian Rupees.
function formatCurrency(amount) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(amount);
}

// Get the budget for the currently selected month.
function getMonthlyBudget(month) {
  const savedBudgets = JSON.parse(
    localStorage.getItem("expenseWiseBudgets") || "{}",
  );

  return Number(savedBudgets[month]) || 0;
}

// Save the budget for the currently selected month.
function saveMonthlyBudget(amount) {
  const savedBudgets = JSON.parse(
    localStorage.getItem("expenseWiseBudgets") || "{}",
  );

  savedBudgets[selectedMonth.value] = amount;

  localStorage.setItem("expenseWiseBudgets", JSON.stringify(savedBudgets));
}

// Update the budget display.
function updateBudget(expenses) {
  const budget = getMonthlyBudget(selectedMonth.value);

  budgetTotal.textContent = formatCurrency(budget);
  budgetSpent.textContent = formatCurrency(expenses);

  const remaining = budget - expenses;

  budgetRemaining.textContent = formatCurrency(remaining);

  if (budget <= 0) {
    budgetProgressBar.style.width = "0%";
    budgetMessage.textContent =
      "Set a monthly budget to start tracking your spending.";
    return;
  }

  const percentage = (expenses / budget) * 100;

  budgetProgressBar.style.width = `${Math.min(percentage, 100)}%`;

  if (percentage >= 100) {
    budgetMessage.textContent =
      "Budget exceeded! Your expenses are higher than your monthly budget.";
  } else if (percentage >= 80) {
    budgetMessage.textContent =
      "Warning: You have used 80% or more of your monthly budget.";
  } else {
    budgetMessage.textContent = "Your spending is within the monthly budget.";
  }
}
// Update the main dashboard.
function updateDashboard() {
  const month = selectedMonth.value;

  const monthlyTransactions = transactions.filter((transaction) => {
    return transaction.date.startsWith(month);
  });

  let income = 0;
  let expenses = 0;

  monthlyTransactions.forEach((transaction) => {
    if (transaction.type === "income") {
      income += transaction.amount;
    } else {
      expenses += transaction.amount;
    }
  });

  totalIncome.textContent = formatCurrency(income);
  totalExpenses.textContent = formatCurrency(expenses);
  totalBalance.textContent = formatCurrency(income - expenses);

  transactionCount.textContent = `${transactions.length} ${transactions.length === 1 ? "record" : "records"}`;

  displayTransactions();

  displayMonthlyAnalytics(monthlyTransactions, income, expenses);

  // Refresh both charts whenever the dashboard changes.
  renderExpenseChart(monthlyTransactions);
  renderMonthlyComparison();
  updateBudget(expenses);
}

// Display monthly analytics.
function displayMonthlyAnalytics(monthlyTransactions, income, expenses) {
  const monthlySummary = document.getElementById("monthlySummary");
  const categoryBreakdown = document.getElementById("categoryBreakdown");

  monthlySummary.replaceChildren();
  categoryBreakdown.replaceChildren();

  const summaryItems = [
    { label: "Monthly Income", amount: income },
    { label: "Monthly Expenses", amount: expenses },
    { label: "Monthly Savings", amount: income - expenses },
  ];

  summaryItems.forEach((item) => {
    const card = document.createElement("div");
    card.className = "monthly-stat";

    const label = document.createElement("p");
    label.textContent = item.label;

    const amount = document.createElement("h3");
    amount.textContent = formatCurrency(item.amount);

    card.append(label, amount);

    monthlySummary.appendChild(card);
  });

  const categoryTotals = {};

  monthlyTransactions.forEach((transaction) => {
    if (transaction.type !== "expense") {
      return;
    }

    categoryTotals[transaction.category] =
      (categoryTotals[transaction.category] || 0) + transaction.amount;
  });

  const categories = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);

  if (categories.length === 0) {
    const message = document.createElement("p");

    message.className = "analytics-empty";

    message.textContent = "No expenses recorded for this month yet.";

    categoryBreakdown.appendChild(message);

    return;
  }

  const highestExpense = categories[0][1];

  categories.forEach(([category, amount]) => {
    const row = document.createElement("div");
    row.className = "category-row";

    const info = document.createElement("div");
    info.className = "category-info";

    const name = document.createElement("strong");
    name.textContent = category;

    const value = document.createElement("span");
    value.textContent = formatCurrency(amount);

    info.append(name, value);

    const track = document.createElement("div");
    track.className = "category-track";

    const fill = document.createElement("div");
    fill.className = "category-fill";

    fill.style.width = `${(amount / highestExpense) * 100}%`;

    track.appendChild(fill);

    row.append(info, track);

    categoryBreakdown.appendChild(row);
  });
}

// Display doughnut chart for expense categories.
function renderExpenseChart(monthlyTransactions) {
  // Check whether Chart.js and canvas are available.
  if (typeof Chart === "undefined" || !expenseChartCanvas) {
    console.error("Chart.js or the expense chart canvas is missing.");

    return;
  }

  const categoryTotals = {};

  monthlyTransactions.forEach((transaction) => {
    if (transaction.type !== "expense") {
      return;
    }

    categoryTotals[transaction.category] =
      (categoryTotals[transaction.category] || 0) + transaction.amount;
  });

  const categories = Object.keys(categoryTotals);
  const amounts = Object.values(categoryTotals);

  // Destroy the previous chart before creating a new one.
  if (expenseChart) {
    expenseChart.destroy();
  }

  expenseChart = new Chart(expenseChartCanvas, {
    type: "doughnut",

    data: {
      labels: categories,

      datasets: [
        {
          label: "Expenses",

          data: amounts,

          backgroundColor: [
            "#176B55",
            "#438CE5",
            "#E5A443",
            "#C45A51",
            "#8B6BB5",
            "#4D9EAB",
            "#91A65B",
            "#D68AAB",
            "#7D8A96",
            "#B69B77",
          ],

          borderWidth: 2,
          borderColor: "#FFFFFF",
          hoverOffset: 8,
        },
      ],
    },

    options: {
      responsive: true,
      maintainAspectRatio: false,

      plugins: {
        legend: {
          position: "bottom",

          labels: {
            padding: 18,
            usePointStyle: true,
          },
        },

        tooltip: {
          callbacks: {
            label: function (context) {
              return context.label + ": " + formatCurrency(context.parsed);
            },
          },
        },
      },
    },
  });
}

// Display monthly income vs expenses bar chart.
function renderMonthlyComparison() {
  // Check whether Chart.js and canvas are available.
  if (typeof Chart === "undefined" || !monthlyChartCanvas) {
    console.error("Chart.js or the monthly chart canvas is missing.");

    return;
  }

  const selectedValue = selectedMonth.value;

  if (!selectedValue) {
    return;
  }

  const [year, month] = selectedValue.split("-").map(Number);

  const labels = [];
  const incomeData = [];
  const expenseData = [];

  // Show the selected month and five previous months.
  for (let i = 5; i >= 0; i--) {
    const date = new Date(year, month - 1 - i, 1);

    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

    labels.push(
      date.toLocaleDateString("en-IN", {
        month: "short",
        year: "2-digit",
      }),
    );

    let income = 0;
    let expenses = 0;

    transactions.forEach((transaction) => {
      if (transaction.date.startsWith(monthKey)) {
        if (transaction.type === "income") {
          income += transaction.amount;
        } else {
          expenses += transaction.amount;
        }
      }
    });

    incomeData.push(income);
    expenseData.push(expenses);
  }

  // Destroy the previous chart before creating a new one.
  if (monthlyChart) {
    monthlyChart.destroy();
  }

  monthlyChart = new Chart(monthlyChartCanvas, {
    type: "bar",

    data: {
      labels: labels,

      datasets: [
        {
          label: "Income",
          data: incomeData,
          backgroundColor: "#18865D",
          borderRadius: 5,
        },

        {
          label: "Expenses",
          data: expenseData,
          backgroundColor: "#C45A51",
          borderRadius: 5,
        },
      ],
    },

    options: {
      responsive: true,
      maintainAspectRatio: false,

      scales: {
        y: {
          beginAtZero: true,

          ticks: {
            callback: function (value) {
              return "₹" + value.toLocaleString("en-IN");
            },
          },
        },
      },

      plugins: {
        legend: {
          position: "bottom",
        },

        tooltip: {
          callbacks: {
            label: function (context) {
              return (
                context.dataset.label + ": " + formatCurrency(context.parsed.y)
              );
            },
          },
        },
      },
    },
  });
}

// Display all transactions.
function displayTransactions() {
  transactionList.replaceChildren();

  if (transactions.length === 0) {
    const emptyState = document.createElement("div");
    emptyState.className = "empty-state";

    const icon = document.createElement("div");
    icon.className = "empty-icon";
    icon.textContent = "₹";

    const heading = document.createElement("h3");
    heading.textContent = "No transactions yet";

    const message = document.createElement("p");
    message.textContent = "Add your first income or expense to get started.";

    emptyState.append(icon, heading, message);

    transactionList.appendChild(emptyState);

    return;
  }

  // Show the newest transactions first.
  const sortedTransactions = [...transactions].sort((a, b) => {
    const dateDifference = b.date.localeCompare(a.date);

    if (dateDifference !== 0) {
      return dateDifference;
    }

    return b.id.localeCompare(a.id);
  });

  sortedTransactions.forEach((transaction) => {
    const item = document.createElement("article");
    item.className = "transaction-item";

    const icon = document.createElement("div");
    icon.className = "transaction-icon";

    icon.textContent = categoryIcons[transaction.category] || "💰";

    const details = document.createElement("div");
    details.className = "transaction-details";

    const title = document.createElement("h3");
    title.textContent = transaction.title;

    const info = document.createElement("p");

    info.textContent = `${transaction.category} · ${formatDate(transaction.date)}`;

    details.append(title, info);

    const rightSide = document.createElement("div");
    rightSide.className = "transaction-right";

    const amount = document.createElement("span");

    amount.className = `transaction-amount ${transaction.type}`;

    const sign = transaction.type === "income" ? "+" : "−";

    amount.textContent = `${sign}${formatCurrency(transaction.amount)}`;

    const deleteButton = document.createElement("button");

    deleteButton.type = "button";
    deleteButton.className = "delete-button";
    deleteButton.textContent = "Delete";

    deleteButton.setAttribute(
      "aria-label",
      `Delete transaction: ${transaction.title}`,
    );

    deleteButton.addEventListener("click", () => {
      deleteTransaction(transaction.id);
    });

    rightSide.append(amount, deleteButton);

    item.append(icon, details, rightSide);

    transactionList.appendChild(item);
  });
}

// Format transaction date.
function formatDate(dateString) {
  const date = new Date(dateString + "T00:00:00");

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// Delete transaction.
function deleteTransaction(transactionId) {
  const originalTransactions = transactions;

  transactions = transactions.filter(
    (transaction) => transaction.id !== transactionId,
  );

  if (!saveTransactions()) {
    transactions = originalTransactions;

    return;
  }

  formMessage.textContent = "Transaction deleted successfully.";

  updateDashboard();
}

// Add a new transaction.
transactionForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const title = transactionTitle.value.trim();
  const amount = Number(transactionAmount.value);
  const category = transactionCategory.value;
  const type = transactionType.value;
  const date = transactionDate.value;

  if (!title) {
    formMessage.textContent = "Please enter a description.";

    transactionTitle.focus();

    return;
  }

  if (!Number.isFinite(amount) || amount <= 0 || amount > 1000000000) {
    formMessage.textContent = "Enter a valid amount greater than zero.";

    transactionAmount.focus();

    return;
  }

  if (!date) {
    formMessage.textContent = "Please select a transaction date.";

    transactionDate.focus();

    return;
  }

  if (date > getTodayDate()) {
    formMessage.textContent = "Future dates are not allowed.";

    transactionDate.focus();

    return;
  }

  const newTransaction = {
    id: crypto.randomUUID(),

    title,
    amount,
    category,
    type,
    date,
  };

  transactions.push(newTransaction);

  if (!saveTransactions()) {
    transactions.pop();

    return;
  }

  transactionForm.reset();

  transactionType.value = "expense";

  transactionDate.value = getTodayDate();

  formMessage.textContent = "Transaction added successfully!";

  updateDashboard();
});

// Get today's date in YYYY-MM-DD format.
function getTodayDate() {
  const now = new Date();

  const year = now.getFullYear();

  const month = String(now.getMonth() + 1).padStart(2, "0");

  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

// Display today's date.
document.getElementById("todayDate").textContent =
  new Date().toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

// Set date field limits.
transactionDate.max = getTodayDate();
transactionDate.value = getTodayDate();

// Set the default month for analytics.
selectedMonth.max = getTodayDate().slice(0, 7);
selectedMonth.value = getTodayDate().slice(0, 7);

// Refresh analytics whenever the month changes.
selectedMonth.addEventListener("change", updateDashboard);
saveBudgetButton.addEventListener("click", () => {
  const amount = Number(budgetAmount.value);

  if (!Number.isFinite(amount) || amount <= 0) {
    budgetMessage.textContent = "Please enter a valid monthly budget.";

    budgetAmount.focus();
    return;
  }

  saveMonthlyBudget(amount);

  budgetMessage.textContent = "Monthly budget saved successfully.";

  updateDashboard();
});

// Draw the dashboard using saved transactions.
updateDashboard();

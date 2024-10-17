

const startingPriceInput = document.getElementById('startingPrice');
const downPaymentInput = document.getElementById('downPayment');
const downPaymentTypeInput = document.getElementById('downPaymentType');
const interestRateInput = document.getElementById('interestRate');
const amortizationPeriodInput = document.getElementById('amortizationPeriod');
const monthlyPaymentEl = document.getElementById('monthlyPayment');
const totalMortgageEl = document.getElementById('totalMortgage');
const totalInterestEl = document.getElementById('totalInterest');
const totalInstallmentsEl = document.getElementById('installments');
const amortizationScheduleEl = document.getElementById('amortizationSchedule');
const errorMessageEl = document.getElementById('errorMessage');
// ... (keep existing variable declarations) ...

function formatCurrency(value) {
    value = value.replace(/[^\d.]/g, '');
    const parts = value.split('.');
    if (parts.length > 1) {
        parts[1] = parts[1].slice(0, 2);
        value = parts.join('.');
    }
    value = value.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return value;
}

function handleCurrencyInput(input) {
    const cursorPosition = input.selectionStart;
    const oldLength = input.value.length;
    input.value = formatCurrency(input.value);
    const newLength = input.value.length;
    input.setSelectionRange(cursorPosition + (newLength - oldLength), cursorPosition + (newLength - oldLength));
}


startingPriceInput.addEventListener('input', () => {
    handleCurrencyInput(startingPriceInput);
    calculateMortgage();
});
downPaymentInput.addEventListener('input', () => {
    handleCurrencyInput(downPaymentInput);
    calculateMortgage();
});
downPaymentTypeInput.addEventListener('change', calculateMortgage);
interestRateInput.addEventListener('input', calculateMortgage);
amortizationPeriodInput.addEventListener('change', calculateMortgage);



function calculateMortgage() {
    const startingPrice = parseFloat(startingPriceInput.value.replace(/[^\d.]/g, ''));
    let downPayment = parseFloat(downPaymentInput.value.replace(/[^\d.]/g, ''));
    const downPaymentType = downPaymentTypeInput.value;
    const annualInterestRate = parseFloat(interestRateInput.value) / 100;
    const amortizationPeriod = parseInt(amortizationPeriodInput.value);

    if (!startingPrice || !downPayment || !annualInterestRate || !amortizationPeriod) {
        hideResults();
        return;
    }

    if (downPaymentType === "%") {
        downPayment = (downPayment / 100) * startingPrice;
    }

    const mortgageAmount = startingPrice - downPayment;
    const monthlyInterestRate = annualInterestRate / 12;
    const numberOfPayments = amortizationPeriod * 12;

    const monthlyPayment = (mortgageAmount * monthlyInterestRate) / (1 - Math.pow(1 + monthlyInterestRate, -numberOfPayments));
    const totalInterest = (monthlyPayment * numberOfPayments) - mortgageAmount;

    monthlyPaymentEl.textContent = `$${monthlyPayment.toFixed(2)}`;
    totalMortgageEl.textContent = `$${mortgageAmount.toFixed(2)}`;
    totalInterestEl.textContent = `$${totalInterest.toFixed(2)}`;
    totalInstallmentsEl.textContent = `${numberOfPayments}`;

    createAmortizationSchedule(mortgageAmount, monthlyInterestRate, monthlyPayment, numberOfPayments);
    createChart(mortgageAmount, monthlyInterestRate, monthlyPayment, numberOfPayments);
    showResults();
}


function createAmortizationSchedule(principal, monthlyInterestRate, monthlyPayment, numberOfPayments) {
    let balance = principal;
    let totalCapital = 0;
    let totalInterests = 0;
    let schedule = `
<div class="table-responsive">
<table class="amortization-table">
<thead>
    <tr>
        <th>Month</th>
        <th>Principal Balance</th>
        <th>Capital Paid</th>
        <th>Total Capital</th>
        <th>Interests Paid</th>
        <th>Total Interests</th>
    </tr>
</thead>
<tbody>`;

    // Add initial row with starting balance
    schedule += `
    <tr>
        <td data-label="Month">0</td>
        <td data-label="Principal Balance">$${balance.toFixed(2)}</td>
        <td data-label="Capital Paid">$0.00</td>
        <td data-label="Total Capital">$0.00</td>
        <td data-label="Interests Paid">$0.00</td>
        <td data-label="Total Interests">$0.00</td>
    </tr>`;

    for (let i = 1; i <= numberOfPayments; i++) {
        const interestPayment = balance * monthlyInterestRate;
        let principalPayment = monthlyPayment - interestPayment;

        // Adjust the last payment to not exceed the remaining balance
        if (balance - principalPayment < 0) {
            principalPayment = balance;
            balance = 0;
        } else {
            balance -= principalPayment;
        }

        totalCapital += principalPayment;
        totalInterests += interestPayment;

        schedule += `
    <tr>
        <td data-label="Month">${i}</td>
        <td data-label="Principal Balance">$${balance.toFixed(2)}</td>
        <td data-label="Capital Paid">$${principalPayment.toFixed(2)}</td>
        <td data-label="Total Capital">$${totalCapital.toFixed(2)}</td>
        <td data-label="Interests Paid">$${interestPayment.toFixed(2)}</td>
        <td data-label="Total Interests">$${totalInterests.toFixed(2)}</td>
    </tr>`;

        // Add year separator after each 12-month cycle
        if (i % 12 === 0) {
            schedule += `
    <tr class="year-separator">
        <td colspan="6"> <strong> Year ${i / 12} </strong> </td>
    </tr>`;
        }

        // Break the loop if the balance is zero
        if (balance === 0) {
            break;
        }
    }

    schedule += `
</tbody>
</table>
</div>`;
    amortizationScheduleEl.innerHTML = schedule;
}

// --------------------------------------------------------------


function createChart(principal, monthlyInterestRate, monthlyPayment, numberOfPayments) {
    let balance = principal;
    let totalCapital = 0;
    let totalInterests = 0;
    const data = [];

    for (let month = 1; month <= numberOfPayments; month++) {
        const interestPayment = balance * monthlyInterestRate;
        const principalPayment = monthlyPayment - interestPayment;
        balance -= principalPayment;
        totalCapital += principalPayment;
        totalInterests += interestPayment;

        data.push({
            month,
            principalBalance: balance,
            totalCapital,
            totalInterests
        });
    }

    const ctx = document.getElementById('amortizationChart').getContext('2d');
    if (window.myChart) {
        window.myChart.destroy();
    }

    // Dynamic calculation of the maximum value across all datasets
    const allValues = data.flatMap(d => [d.principalBalance, d.totalCapital, d.totalInterests]);
    const maxValue = Math.max(...allValues);

    var yValues = [55, 49, 44, 24, 15];

    window.myChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.map(d => d.month),
            datasets: [
                {
                    label: 'Principal Balance',
                    data: data.map(d => d.principalBalance),
                    borderColor: 'rgb(75, 192, 192)',
                    tension: 0.1
                },
                {
                    label: 'Total Capital',
                    data: data.map(d => d.totalCapital),
                    borderColor: 'rgb(255, 99, 132)',
                    tension: 0.1
                },
                {
                    label: 'Total Interests',
                    data: data.map(d => d.totalInterests),
                    borderColor: 'rgb(54, 162, 235)',
                    tension: 0.1
                },
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Month'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Amount ($)'
                    },
                    beginAtZero: true,
                    suggestedMax: maxValue * 1.1, // 10% padding for dynamic max value
                    min: 0, // Explicitly set the minimum value to 0
                    ticks: {
                        callback: function (value, index, values) {
                            return '$' + value.toLocaleString();
                        }
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed.y !== null) {
                                label += new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(context.parsed.y);
                            }
                            return label;
                        }
                    }
                }
            }
        }
    });
}

// --------------------------------------------------------------

function showResults() {
    document.getElementById('graph-container').style.display = 'flex';
    document.getElementById('amortizationSchedule').style.display = 'flex';
}

function hideResults() {
    document.getElementById('graph-container').style.display = 'none';
    document.getElementById('amortizationSchedule').style.display = 'none';
}

function showError(message) {
    errorMessageEl.textContent = message;
    errorMessageEl.style.display = 'block';
}

function hideError() {
    errorMessageEl.style.display = 'none';
}





// Select the advertisement card
const adCard = document.querySelector('.servicesAdvertisment');

// Function to apply the tilt effect based on mouse position
adCard.addEventListener('mousemove', (e) => {
    const cardWidth = adCard.offsetWidth;
    const cardHeight = adCard.offsetHeight;
    const centerX = adCard.offsetLeft + cardWidth / 2;
    const centerY = adCard.offsetTop + cardHeight / 2;

    const mouseX = e.clientX - centerX;
    const mouseY = e.clientY - centerY;

    const rotateX = (mouseY / cardHeight) * 0; // Adjust tilt intensity
    const rotateY = (mouseX / cardWidth) * 2; // Adjust tilt intensity

    adCard.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.01)`;
});

// Reset the tilt effect when the mouse leaves the card
adCard.addEventListener('mouseleave', () => {
    adCard.style.transform = `perspective(800px) scale(1) rotateX(0) rotateY(0)`;
});










document.getElementById("apply-now").addEventListener("click", function () {
    window.location.href = "https://app.freedomcapital.com/";
});

function callNow(e) {
    e.preventDefault();
    window.location.href = "tel:+18669447778";
}

// Add click event listener for the call button
adCard.addEventListener("click", callNow);    

document.getElementById("call-now").addEventListener("click", callNow);






const downPaymentType = document.getElementById("downPaymentType");
const symbol = document.getElementById("symbol");


downPaymentType.addEventListener("change", function () {
    const selectedValue = downPaymentType.value;

    // Update the symbol based on the selection
    symbol.textContent = selectedValue;

    // Adjust padding based on the selected option
    downPaymentInput.style.paddingLeft = selectedValue === "%" ? "28px" : "22px";
});









document.addEventListener("DOMContentLoaded", function() {
    if (typeof Chart !== 'undefined') {
        var userCtx = document.getElementById("userGrowthChart");
        if (userCtx && !Chart.getChart(userCtx)) {
            new Chart(userCtx, {
                type: "line",
                data: {
                    labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
                    datasets: [{
                        label: "مستخدمين جدد",
                        data: [120, 190, 300, 500, 800, 1200],
                        borderColor: "#0f62fe",
                        backgroundColor: "rgba(15, 98, 254, 0.1)",
                        fill: true,
                        tension: 0.4
                    }]
                },
                options: { responsive: true, plugins: { legend: { display: false } } }
            });
        }
        var revCtx = document.getElementById("revenueChart");
        if (revCtx && !Chart.getChart(revCtx)) {
            new Chart(revCtx, {
                type: "bar",
                data: {
                    labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
                    datasets: [{
                        label: "الأرباح",
                        data: [500, 1200, 3000, 4500, 7000, 12500],
                        backgroundColor: "#198038",
                        borderRadius: 4
                    }]
                },
                options: { responsive: true, plugins: { legend: { display: false } } }
            });
        }
    }
});

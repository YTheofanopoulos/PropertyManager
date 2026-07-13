window.PM = {
  table: function(selector, options) {
    const defaults = {
      pageLength: 10,
      lengthMenu: [[10, 25, 50], [10, 25, 50]],
      stateSave: true,
      responsive: true,
      dom: "<'row mb-3'<'col-md-6'f><'col-md-6 text-right'B>>rt<'row mt-3'<'col-md-6'i><'col-md-6'p>>",
      buttons: [
        {extend:"csvHtml5", text:"Export CSV", className:"btn btn-outline-secondary btn-sm"}
      ],
      language: {search:"", searchPlaceholder:"Search records..."}
    };
    return $(selector).DataTable($.extend(true, {}, defaults, options || {}));
  },
  charts: {
    line: function(id, labels, values, label) {
      return new Chart(document.getElementById(id), {
        type: "line",
        data: {labels: labels, datasets: [{label: label, data: values, tension: .3, fill: false}]},
        options: {responsive:true, plugins:{legend:{display:false}}, scales:{y:{beginAtZero:false}}}
      });
    },
    bar: function(id, labels, values, label) {
      return new Chart(document.getElementById(id), {
        type: "bar",
        data: {labels: labels, datasets: [{label: label, data: values}]},
        options: {responsive:true, plugins:{legend:{display:false}}, scales:{y:{beginAtZero:true,max:100}}}
      });
    }
  }
};

$(function(){
  $("#sidebarToggle").on("click", function(){
    if (window.innerWidth <= 900) $("body").toggleClass("sidebar-open");
    else $("body").toggleClass("sidebar-collapsed");
  });

  const path = window.location.pathname;
  $(".nav-item").each(function(){
    const href = $(this).attr("href");
    if (href === path || (href !== "/" && path.startsWith(href))) $(this).addClass("active");
  });
});

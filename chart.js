var chart;

function chart_init() {
    chart = new CanvasJS.Chart("chartContainer", chart_cfg);
    chart.render();
}

var chart_cfg = {
    title: {
        text: "ITA Covid-19"
    },
    axisX: {
        valueFormatString: "DD MMM"
    },
    axisY2: {
        title: "persone",
    },
    toolTip: {
        shared: true
    },
    legend: {
        cursor: "pointer",
        verticalAlign: "top",
        horizontalAlign: "center",
        dockInsidePlotArea: true,
        itemclick: toggleDataSeries
    },
    data: []
};

function toggleDataSeries(e){
    if (typeof(e.dataSeries.visible) === "undefined" || e.dataSeries.visible) {
        e.dataSeries.visible = false;
    } else{
        e.dataSeries.visible = true;
    }
    chart.render();
}

function add_data_series(name, data_x, data_y){
    var points = data_x.map(function(x, i) {return {"x": x, "y": data_y[i]}});
    chart.options.data.push({
        type: "line",
        axisYType: "secondary",
        name: name,
        showInLegend: true,
        markerSize: 2,
        dataPoints: points
    });
    chart.render();
};

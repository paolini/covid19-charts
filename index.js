var datasets = [
    new DpcNazionaleDataset(),
    new DpcRegioniDataset(),
    new DpcProvinceDataset(),
    new HopkinsConfirmedDataset()
]

var chart;

$(function () {
    chart = new ChartWrapper();

    $("select[name='chart_scale']").change(function(){
        var val = $(this).children("option:selected").val();
        chart.set_logarithmic(val==='log');
    });

    datasets.forEach(function(dataset){
        dataset.run();
    });

});   
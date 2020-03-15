var datasets = [
    new DpcNazionaleDataset(),
    new DpcRegioniDataset(),
    new DpcProvinceDataset(),
    new HopkinsConfirmedDataset(),
    new HopkinsDeathsDataset(),
    new HopkinsRecoveredDataset()
]

var chart;

$(function () {
    chart = new ChartWrapper();

    datasets.forEach(function(dataset){
        dataset.run();
    });

});   
function last(arr) {
    return arr[arr.length-1]
}

var chart_config = {
    type: 'line',
    options: {
        title: {
            text: 'covid-19'
        },
        tooltips: {
            callbacks: {
                _title: function(tooltipItems, data) {
                    // in tooltipItems ci sono anche i fit
                    var axis = data.datasets[tooltipItems[0].datasetIndex].xAxisID;
                    return "axis";
                },
                label: function(tooltipItem, data) {
                    var dataset = data.datasets[tooltipItem.datasetIndex];
                    var label = dataset.label || '';

                    if (dataset.xAxisID === 'days') {
                        label += " " + days_to_date(tooltipItem.xLabel - dataset.my_x_offset).toDateString();
                    }
                    label += ': ';
                    label += tooltipItem.yLabel;
                    return label;
                }
            }
        },
        scales: {
            xAxes: [{
                id: 'date',
                type: 'time',
                time: {
                    tooltipFormat: 'll HH:mm'
                },
                scaleLabel: {
                    display: true,
                    labelString: 'date'
                },
                ticks: {
                        major: {
                            enabled: true,
                            fontStyle: 'bold'
                        },
                        source: 'data',
                        autoSkip: true,
                        autoSkipPadding: 75,
                        maxRotation: 0,
                        sampleSize: 100
                    },
                    afterBuildTicks: function(scale, ticks) {
                        var majorUnit = scale._majorUnit;
                        if (! ticks) return;
                        var firstTick = ticks[0];
                        var i, ilen, val, tick, currMajor, lastMajor;

                        val = moment(ticks[0].value);
                        if ((majorUnit === 'minute' && val.second() === 0)
                                || (majorUnit === 'hour' && val.minute() === 0)
                                || (majorUnit === 'day' && val.hour() === 9)
                                || (majorUnit === 'month' && val.date() <= 3 && val.isoWeekday() === 1)
                                || (majorUnit === 'year' && val.month() === 0)) {
                            firstTick.major = true;
                        } else {
                            firstTick.major = false;
                        }
                        lastMajor = val.get(majorUnit);

                        for (i = 1, ilen = ticks.length; i < ilen; i++) {
                            tick = ticks[i];
                            val = moment(tick.value);
                            currMajor = val.get(majorUnit);
                            tick.major = currMajor !== lastMajor;
                            lastMajor = currMajor;
                        }
                        return ticks;
                    }
            },{
                id: "days",
                type: "linear",
                scaleLabel: {
                    display: true,
                    labelString: "days"
                }
            }],
            yAxes: [{
                id: "count",
                scaleLabel: {
                    display: true,
                    labelString: 'count'
                },
                ticks: {
                    beginAtZero: true,
                },
                type: 'linear',
                display: true
            },{
                id: "rate",
                scaleLabel: {
                    display: true,
                    labelString: '%'
                },
                ticks: {
                    beginAtZero: true,
                },
                type: 'linear',
                display: false
            }
            ]
        },
        plugins: {
            colorschemes: { // https://nagix.github.io/chartjs-plugin-colorschemes/
              scheme: 'tableau.Tableau10' // ignored: see Chart.add_series below
            }
      
        }
    }
};

var months = ["jan", "feb", "mar", "apr", "maj", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

class ChartWrapper {
    constructor() {
        var self = this;
        var ctx = document.getElementById('canvas').getContext('2d');
        this.chart = new Chart(ctx, chart_config); 
        this.serieses = [];   
        this.days_today = date_to_days(new Date());
        this.time_shift = 'none';
        this.rate_plot = false;
        this.no_update = false;
        this.draw_fit = false;
        this.n_points = 0; // all
        this.fit_future_days = null;
        this.up_to_date = null;
        this.download_url = null;

        this.$info = $("#chart_info");
        this.$clear = $("button[name='chart_clear']");
        this.$pop = $("button[name='chart_pop']");
        this.$time_shift = $("select[name=time_shift]");
        this.$plot_type = $("select[name=chart_type]");
        this.$draw_fit = $("input[name=draw_fit");
        this.$n_points = $("select[name='n_points']");
        this.$advanced_settings = $("input[name='advanced_settings']");
        this.$axis_date_min = $("input[name='axis_date_min']");
        this.$axis_date_max = $("input[name='axis_date_max']");
        this.$axis_days_min = $("input[name='axis_days_min']");
        this.$axis_days_max = $("input[name='axis_days_max']");
        this.$axis_count_min = $("input[name='axis_count_min']");
        this.$axis_count_max = $("input[name='axis_count_max']");
        this.$fit_future_days = $("input[name='fit_future_days']");
        this.$up_to_date = $("input[name='up_to_date']");
        this.$download = $("#download_button");
    
        this.$clear.click(function(){ 
            self.clear(); 
            replay.length = 0;
        });

        this.$pop.click(function() {
            self.pop();
            replay.pop();
        })

        this.$time_shift.change(function(){
            self.time_shift = self.$time_shift.val();
            self.redraw();
        })
        this.$time_shift.change();

        this.$plot_type.change(function() {
            var val = self.$plot_type.children("option:selected").val();
            self.chart.options.scales.yAxes[0].type = (val=="log") ? 'logarithmic' : 'linear';
            self.rate_plot = (val=="rate");
            self.redraw();
        })
        this.$plot_type.change();

        this.$draw_fit.change(function(){
            self.draw_fit = self.$draw_fit.is(":checked");
            self.redraw();
        })
        this.$draw_fit.change();

        this.$n_points.change(function() {
            var val = self.$n_points.children("option:selected").val();
            if (val === "") {
                self.n_points = 0;
            } else {
                self.n_points = parseInt(val);
            }
            self.redraw();
        });
        this.$n_points.change();

        this.$up_to_date.datepicker();
        this.$up_to_date.change(function() {
            var val = self.$up_to_date.val();
            if (val === "") {
                self.up_to_date = null;
            } else {
                self.up_to_date = new Date(val + "T23:59");
            }
            self.redraw();
        });
        this.$up_to_date.change();

        this.$advanced_settings.change(function() {
            if (self.$advanced_settings.is(":checked")) {
                $("#advanced_settings").show();
            } else {
                $("#advanced_settings").hide();
            }
        })
        this.$advanced_settings.change();

        this.$axis_date_min.datepicker();
        this.$axis_date_min.change(function() {
            var val = self.$axis_date_min.val();
            self.chart.config.options.scales.xAxes[0].ticks.min = val ? new Date(val) : undefined;
            self.update();
        });
        this.$axis_date_min.change();

        this.$axis_date_max.datepicker();
        this.$axis_date_max.change(function() {
            var val = self.$axis_date_max.val();
            self.chart.config.options.scales.xAxes[0].ticks.max = val ? new Date(val) : undefined;
            self.update();
        })
        this.$axis_date_max.change();
        
        this.$axis_days_min.change(function() {
            var val = self.$axis_days_min.val();
            self.chart.config.options.scales.xAxes[1].ticks.min = val ? parseInt(val) : undefined;
            self.update();
        });
        this.$axis_days_min.change();

        this.$axis_days_max.change(function() {
            var val = self.$axis_days_max.val();
            self.chart.config.options.scales.xAxes[1].ticks.max = val ? parseInt(val) : undefined;
            self.update();
        })
        this.$axis_days_max.change();
        
        this.$axis_count_min.change(function() {
            var val = self.$axis_count_min.val();
            self.chart.config.options.scales.yAxes[0].ticks.min = val ? parseInt(val) : undefined;
            self.update();
        });
        this.$axis_count_min.change();

        this.$axis_count_max.change(function() {
            var val = self.$axis_count_max.val();
            self.chart.config.options.scales.yAxes[0].ticks.max = val ? parseInt(val) : undefined;
            self.update();
        })
        this.$axis_count_max.change();
        
        this.$fit_future_days.change(function() {
            self.fit_future_days = parseFloat(self.$fit_future_days.val());
            self.redraw();
        })
        this.$fit_future_days.change();

        this.$download.click(function() {
            if (self.download_url) {
                URL.revokeObjectURL(self.download_url);
            }
            var blob = self.prepare_csv();
            self.download_url = URL.createObjectURL(blob);
            self.$download.attr("href", self.download_url);
            self.$download.attr("target", "_blank");
            self.$download.attr("download", "covid19-charts.csv");
        });
    }

    get_options() {
        return {
            time_shift: this.time_shift,
            plot_type: this.$plot_type.children("option:selected").val(),
            draw_fit: this.draw_fit,
            n_points: this.n_points,
            up_to_date: this.$up_to_date.val(),
            axis_days_min: this.$axis_days_min.val(),
            axis_days_max: this.$axis_days_max.val(),
            axis_date_min: this.$axis_date_min.val(),
            axis_date_max: this.$axis_date_max.val(),
            axis_count_min: this.$axis_count_min.val(),
            axis_count_max: this.$axis_count_max.val(),
            fit_future_days: this.fit_future_days
        }
    }

    set_options(options) {
        this.$time_shift.prop('checked', options['time_shift']);
        this.$time_shift.change();
        this.$plot_type.val(options['plot_type']);
        this.$plot_type.change();
        this.$draw_fit.prop('checked', options['draw_fit']);
        this.$draw_fit.change();
        this.$n_points.val(options['n_points'] || "");
        this.$n_points.change();
        this.$up_to_date.val(options['up_to_date']);
        this.$up_to_date.change();
        this.$axis_days_min.val(options['axis_days_min']);
        this.$axis_days_min.change();
        this.$axis_days_max.val(options['axis_days_max']);
        this.$axis_days_max.change();
        this.$axis_date_min.val(options['axis_date_min']);
        this.$axis_date_min.change();
        this.$axis_date_max.val(options['axis_date_max']);
        this.$axis_date_max.change();
        this.$axis_count_min.val(options['axis_count_min']);
        this.$axis_count_min.change();
        this.$axis_count_max.val(options['axis_count_max']);
        this.$axis_count_max.change();
        this.$fit_future_days.val(options['fit_future_days']);
    }

    update() {
        var x_axes = [];
        var y_axes = [];
        this.chart.data.datasets.forEach(function(dataset) {
            if (!x_axes.includes(dataset.xAxisID)) x_axes.push(dataset.xAxisID);
            if (!y_axes.includes(dataset.yAxisID)) y_axes.push(dataset.yAxisID);
        });
        this.chart.options.scales.xAxes.forEach(function(axis) {
            axis.display = x_axes.includes(axis.id);
        });
        this.chart.options.scales.yAxes.forEach(function(axis) {
            axis.display = y_axes.includes(axis.id);
        });
        if (this.chart.data.datasets.length === 0) {
            // draw something otherwise window remains completely empty
            this.chart.options.scales.xAxes[0].display = true;
            this.chart.options.scales.yAxes[0].display = true;
        }
        if (!this.no_update) this.chart.update();
    }

    history_offset(data_y) {
        var last = data_y.length-1;
        var ref_data_y = this.ref_data_y;
        var last2 = ref_data_y.length-1;
        if (ref_data_y[last2] > data_y[last]) {
            var i;
            for (i=last2;i>=0 && ref_data_y[i] > data_y[last];i--) {}
            // log(y) = m x + q
            // y0 = m i + q
            // y1 = m (i+1) + q
            // y1 - y0 = m
            var y = Math.log(data_y[last]);
            var y1 = Math.log(ref_data_y[i+1]);
            var y0 = Math.log(ref_data_y[i]);
            var m = y1 - y0;
            // q = y0 - m i
            var q = y0 - m * i;
            // x = (log(y) - q) / m
            i = (y - q) / m;
            return i - last2;
        } else {
            var i;
            for (i=last;i>=0 && ref_data_y[last2] < data_y[i];i--) {}
            var y1 = Math.log(data_y[i+1]);
            var y0 = Math.log(data_y[i]);
            var y = Math.log(ref_data_y[last2])
            var m = y1 - y0;
            var q = y0 - m * i;
            i = (y - q) / m;
            return last-i;
        }
    }


    add_series(series) {
        var self = this;

        // we are going to modify data
        var data_x = series.data_x;
        var data_y = series.data_y;
        var label = series.label;
        
        // crop to up_to_date
        if (this.up_to_date) {
            var i = 0;
            for (i=0; i<data_x.length && data_x[i]<this.up_to_date; ++i) {}
            data_x = data_x.slice(0,i);
            data_y = data_y.slice(0,i);
        }
        if (this.serieses.length === 0) {
            // this will be the reference series for time shifts
            this.ref_data_y = data_y;
        }
    
        // data_x will be days from now on...
        data_x = data_x.map(date_to_days);
        if (this.serieses.length === 0) {
            this.reference_point = {
                x: last(data_x), 
                y: last(data_y)
            }
        }
        
        // consider only last points
        if (this.n_points > 0) {
            data_x = data_x.slice(-this.n_points);
            data_y = data_y.slice(-this.n_points);
        }
        
        if (data_x.length < 2) {
            console.log("too few data points for series " + label);
            return;
        }

        // compute linear regression
        var lr = linearRegression(data_y.map(Math.log), data_x)
        
        // time shift
        var offset = 0;
        if (this.time_shift == 'lr_shift') {
            if (this.serieses.length>0) {
                var lr0 = this.serieses[0].lr;
                // var y0 = this.reference_point.y;
                var y0 = Math.exp(lr0.m * this.reference_point.x + lr0.q);
                // y = exp(m x + q)
                var x = (Math.log(y0) - lr.q) / lr.m;
                offset = last(data_x) - x;
            }
        } else if (this.time_shift === 'past_shift') {
            if (this.serieses.length>0) {
                offset = this.history_offset(data_y);
            }
        }
        if (offset > 0) {
            label += " +" + offset.toFixed(1) + " days";
        } else if (offset < 0) {
            label += " -" + (-offset).toFixed(1) + " days";
        }

        // convert to growing rate
        if (this.rate_plot) {
            var new_data_x = data_x.slice(1);
            var new_data_y = new Array(new_data_x.length);
            for (var i=0; i < new_data_y.length;++i) {
                if (data_y[i]>0) {
                    new_data_y[i] = (data_y[i+1] / data_y[i] - 1.0) * 100.0; 
                } else {
                    new_data_y[i] = 0.0;
                }
            }
            // smooth out 
            for (var i=0; i < new_data_y.length; ++i) {
                if (i==0 && i < new_data_y.length-1) {
                    new_data_y[i] = (new_data_y[i] + new_data_y[i+1]) / 2.0;
                } else if (i>0 && i < new_data_y.length-2) {
                    new_data_y[i] = (new_data_y[i-1] + new_data_y[i] + new_data_y[i+1]) / 3.0;
                } else if (i>0 && i == new_data_y.length-2) {
                    new_data_y[i] = (new_data_y[i-1] + new_data_y[i]) / 2.0;
                }
            }
            data_x = new_data_x;
            data_y = new_data_y;
        }

        // draw curve
        series.color = Chart.colorschemes.tableau.Tableau10[this.serieses.length % 10];
        var points;
        if (this.time_shift) {
            points = data_x.map(function(x, i) {return {
                x: x + offset - self.reference_point.x, 
                y: data_y[i]
            }});            
        } else {
            points = data_x.map(days_to_date).map(function(x, i) {return {"x": x, "y": data_y[i]}});
        }
        this.chart.data.datasets.push({
            data: points,
            label: label,
            fill: false,
            yAxisID: (this.rate_plot ? "rate" : series.y_axis),
            xAxisID: (this.time_shift ? "days" : "date"),
            lineTension: 0,
            borderColor: series.color,
            pointBorderColor: series.color,
            pointBackgroundColor: series.color,
            hoverBorderColor: series.color,
            pointHoverBorderColor: series.color,
            borderJoinStyle: "round",
            my_x_offset: offset - this.reference_point.x
        });

        // draw fit curve
        if (this.draw_fit && data_x.length>1 && isFinite(offset)) {
            var start = data_x[0];
            var end = last(data_x) + this.fit_future_days;
            var points = new Array(100);
            for (var i=0;i<points.length;++i) {
                var x = start + (end-start)*i/(points.length-1);
                points[i] = {
                    x: this.time_shift ? x + offset - this.reference_point.x : days_to_date(x),
                    y: this.rate_plot ? 100.0*(Math.exp(lr.m)-1) : Math.exp(lr.m * x + lr.q)
                }
            }
            this.chart.data.datasets.push({
                data: points,
                fill: false,
                label: 'fit',
                yAxisID: (this.rate_plot ? "rate" : "count"),
                xAxisID: (this.time_shift ? "days" : "date"),
                pointRadius: 0,
                borderWidth: 1,
                pointHoverRadius: 3,
                borderColor: series.color,
                pointBorderColor: series.color,
                pointBackgroundColor: series.color,
                hoverBorderColor: series.color,
                pointHoverBorderColor: series.color,
                my_x_offset: offset - this.reference_point.x
            })
        }

        // store the series for future redraw
        series.lr = lr; // forse non serve...
        this.serieses.push(series);

        this.update();
        this.display_regression(series);
    };

    display_regression(series) {
        var name = series.label;
        var lr = series.lr;
        var days_passed = lr.q/lr.m + this.days_today;
        var first_day = new Date((this.days_today-days_passed)*1000.0*60*60*24);
        this.$info.append(
            "<li> <div class='box' style='background-color:" + series.color + "'></div> "+name+":</font> " 
            + "exponential fit: R<sup>2</sup>=<b>"+lr.r2.toFixed(2)+"</b>, "
            + "average daily increase: <b>"+((Math.exp(lr.m)-1)*100).toFixed(1)+"%</b>, "
            + "doubling time: <b>"+ (Math.log(2.0)/lr.m).toFixed(1) +"</b> days, "
            + "origin <b>" + days_passed.toFixed(1) + "</b> days ago: "
            + "<b>" + first_day.getDate() + " " + months[first_day.getMonth()]+ " " + first_day.getFullYear() + "</b>"
            + "<!-- m="+lr.m+" "
            + "q="+lr.q+" --></li>"
            );
    }
    
    clear() {
        this.chart.data.datasets = [];
        this.serieses = [];
        this.update();
        this.$info.find("li").remove();
    }

    pop() {
        this.chart.data.datasets.pop();
        this.serieses.pop();
        this.redraw();
    }

    redraw() {
        var self = this;
        var serieses = this.serieses; // backup
        var no_update_backup = this.no_update;
        this.no_update = true;
        this.clear();
        serieses.forEach(function (series){
            self.add_series(series);
        })
        this.no_update = no_update_backup;
        this.update();
    }

    prepare_csv() {
        var start=null, end=null;
        var rows = [];
        var row = 'date,day'; // headers
        this.serieses.forEach(function(series){
            if (start === null || series.data_x[0]<start) start = series.data_x[0];
            if (end === null || last(series.data_x)>end) end = last(series.data_x);
            row += ',' + series.label;
        });
        row += '\n';
        rows.push(row); // headers
        if (start !== null) {
            start = Math.ceil(date_to_days(start));
            end = date_to_days(end) + 1;
            var indices = new Array(this.serieses.length);
            indices.fill(0);
            for (var day = 0; start + day < end; day ++) {
                row = days_to_date(start+day-0.5).toISOString().slice(0,10) + "," + day;
                for (var j=0;j<indices.length;++j) {
                    var date = days_to_date(start + day);
                    var val = 0;
                    while (this.serieses[j].data_x[indices[j]] < date) {
                        val = this.serieses[j].data_y[indices[j]];
                        indices[j]++;
                    }
                    row += "," + val.toString();
                }
                row += '\n';
                rows.push(row);
            }
        }
        var blob = new Blob(rows, { type: 'text/csv;charset=utf-8;' });
        return blob;
    }
};

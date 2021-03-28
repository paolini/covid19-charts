class Table {
    constructor(headers, rows) {
        this.headers = headers;
        this.rows = rows;
    }

    filter(column, value) {
        var i = this.headers.indexOf(column);
        return new Table(headers,
            rows.filter(function(row) {return row[i]===value;}));
    }

    get_column(column) {
        var i = this.headers.indexOf(column);
        return this.rows.map(function(row) {return row[i]});
    }
    
    get_column_pairs(col1, col2) {
        var i = this.headers.indexOf(col1);
        var j = this.headers.indexOf(col2);
        return this.rows.map(function(row) {return [row[i], row[j]] });
    }

    get_column_distinct_pairs(id_name, value_name) {
        var values = [];
        this.get_column_pairs(id_name, value_name).forEach(function(pair){
            var i;
            for (i=0;i<values.length && values[i][0]!=pair[0];++i){}
            if (i>=values.length) {
                values.push(pair);
            }
        });
        return values;
    }

    get_column_distinct(id_name) {
        var distinct = [];
        var last = null;
        this.get_column(id_name)
            .sort(function cmp(x,y) {return x.localeCompare(y)})        
            .forEach(function (val) {
                    if (val !== last) {
                        distinct.push(val);
                        last = val;
                    }
            });
        return distinct;
    }

    filter(column, value) {
        var i = this.headers.indexOf(column);
        return new Table(this.headers,
            this.rows.filter(function(row) {return row[i] == value;})
        );
    }    
    
    sort(column) {
        var i = this.headers.indexOf(column);
        function strcmp(str1, str2) {
            return ((str1 == str2)?0:((str1 > str2)?1:-1));
        }
        this.rows.sort((row1,row2) => strcmp(row1[i],row2[i]));
    }
};

function string_to_date(x) {return moment(x).toDate()}

function string_to_int(x) {return parseInt(x)}

function date_to_days(x) {return x.getTime()/(1000.0*60*60*24)}

function days_to_date(x) {return new Date(x*1000.0*60*60*24);}

function dash_to_space(x) {return x.replace(/_/g," ")}

function anglo_to_date(x) {
    var a = x.split('/');
    var day = parseInt(a[1]);
    var month = parseInt(a[0]);
    var year = 2000 + parseInt(parseInt(a[2]));
    return new Date(year, month-1 , day, 18);
}

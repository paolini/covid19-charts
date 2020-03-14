function table_filter(table, column, value) {
    var i = table.headers.indexOf(column);
    return {
        'headers': table.headers,
        'rows': table.rows.filter(function(row) {return row[i] == value;})
    };
}

function table_get_column(table, column_name) {
    var i = table.headers.indexOf(column_name);
    return table.rows.map(function(row) {return row[i]});
}

function table_get_column_distinct(table, column_name) {
    var values = [];
    table_get_column(table, column_name).forEach(function(x){
        if (!values.includes(x)) values.push(x);
    })
    return values;
}

function string_to_date(x) {return new Date(x)}

function string_to_int(x) {return parseInt(x)}

function date_to_days(x) {return x.getTime()/(1000.0*60*60*24)}

function dash_to_space(x) {return x.replace(/_/g," ")}

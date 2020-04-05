import os
import csv
import urllib.request
from zipfile import ZipFile
from collections import defaultdict

out_filename = 'data/istat.csv'

csv_filename = 'comune_giorno.csv'

if not os.path.exists(csv_filename):
    zip_filename = 'dati-comunali-giornalieri-1.zip'
    if not os.path.exists(zip_filename):
        url = 'https://www.istat.it/it/files//2020/03/dati-comunali-giornalieri-1.zip'
        print("retrieving", url)
        urllib.request.urlretrieve(url, zip_filename)
    with ZipFile(zip_filename, 'r') as archive:
        print("unzipping", zip_filename)
        archive.extract(csv_filename)

print('reading', csv_filename)
with open(csv_filename, newline='', encoding='latin-1') as csvfile:
    reader = csv.reader(csvfile)
    data = defaultdict(lambda: defaultdict(lambda: defaultdict(lambda: (0.0, 0)))) # giorno -> regione -> provincia -> (mean, n)
    headers = None
    for row in reader:
        if headers is None:
            headers = row
            assert(headers[2] == 'NOME_REGIONE')
            assert(headers[3] == 'NOME_PROVINCIA')
            assert(headers[7] == 'GE')
            for n in range(6):
                assert(headers[20+n] == 'TOTALE_'+str(15+n))
        else:
            regione = row[2]
            provincia = row[3] 
            giorno = '2020-'+row[7][:2]+'-'+row[7][2:]
            m = sum(int(x) for x in row[20:25]) / 5.0
            n = int(row[25])
            if n == 9999: # dato non disponibile
                n = 0
            mm, nn = data[giorno][regione][provincia]
            mm += m
            nn += n
            data[giorno][regione][provincia] = (mm, nn)

    print('writing', out_filename)    
    with open(out_filename, "w") as out:
        out.write(','.join(['giorno', 'regione', 'provincia', 'm', 'n']) + '\n')
        for day in sorted(data.keys()):
            d = data[day]
            for regione in sorted(d.keys()):
                r = d[regione]
                for provincia in sorted(r.keys()):
                    m, n = r[provincia]
                    out.write(','.join([day,regione,provincia,str(m), str(n)])+'\n')

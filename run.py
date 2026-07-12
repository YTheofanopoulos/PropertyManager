#!/usr/bin/python3

from flask import Flask,render_template
app=Flask(__name__,template_folder='app/templates',static_folder='app/static')
@app.route('/')
def i():
 return render_template('dashboard.html',cards=[('Occupancy','47/50','success'),('Monthly Rent','$52600','primary'),('Past Due','$1850','danger'),('Vacancies','3','warning')],props=[{'name':'Oakwood','units':'24/24'},{'name':'Maple Ridge','units':'11/12'}])
app.run(debug=True)

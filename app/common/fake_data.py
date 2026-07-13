def dashboard():
    return {
      "cards":[
        {"title":"Occupancy","value":"47 / 50","class":"success"},
        {"title":"Monthly Rent","value":"$52,600","class":"primary"},
        {"title":"Past Due","value":"$1,850","class":"danger"},
        {"title":"Vacancies","value":"3","class":"warning"},
      ],
      "properties":[
        {"name":"Oakwood Apartments","occupied":"24/24"},
        {"name":"Maple Ridge","occupied":"11/12"},
        {"name":"Lakeview Villas","occupied":"12/14"},
      ]
    }

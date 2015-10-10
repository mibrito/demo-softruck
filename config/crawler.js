module.exports = {
	estado: ['AC*ACRE'],
	combustivel: {
		487: {
			name: 'Gasolina',
			cod_combustivel: '487',
			selCombustivel: '487*Gasolina'
		},
		643: {
			name: 'Etanol',
			cod_combustivel: '643',
			selCombustivel: '643*Etanol'
		},
		476: {
			name: 'GNV',
			cod_combustivel: '476',
			selCombustivel: '476*GNV'
		},
		532: {
			name: 'Diesel',
			cod_combustivel: '532',
			selCombustivel: '532*Diesel'
		},
		812: {
			name: 'Diesel S10',
			cod_combustivel: '812',
			selCombustivel: '812*Diesel@S10'
		},
		462: {
			name: 'GLP',
			cod_combustivel: '462',
			selCombustivel: '462*GLP'
		}
	},
	statisticTemplate: {
		"type": null,
		"consumerPrice": [{
			"averagePrice": null,
			"standardDeviation": null,
			"minPrice": null,
			"maxPrice": null,
			"averageMargin": null
		}],
		"distributionPrice": [{
			"averagePrice": null,
			"standardDeviation": null,
			"minPrice": null,
			"maxPrice": null
		}]
	},
	stationTemplate: {
		"name": null,
		"address": null,
		"area": null,
		"flag": null,
		"prices": []
	},
	pricesTemplate: {
		"type": null,
		"sellPrice": null,
		"buyPrice": null,
		"saleMode": null,
		"provider": null,
		"date": null,
	}
};
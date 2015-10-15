# GasTruck API

A simple API to serve data on GasTruck project.
Before start using the API the data must be crawled and stored in an Mongo database.
To do that just clone the repo [GasTruckCrawler](https://github.com/mibrito/gastruckcrawler.git)
and follow its instructions.

## Install

```
git clone https://github.com/mibrito/gastruckcrawler.git
npm install
```

## Run
To initiate the service and use the default database "mongodb://localhost/gastruck" and port 3000, just run:

```
npm start
```

### Develop mode

```
npm develop
```

## Extra Parameters

### DB

Change the default database to the desired one

##### Usage

```
DB=mongodb://localhost/gastruck npm start

```
### PORT

Change the default port to the desired one

##### Usage

```
PORT=3000
```


## Required Data Schema

1. States:

```
{
	name: String,
	cities: [ Cities ],
	dates: {
		from: Date
		to: Date
	}
}
```

2. Cities:

```
{
	state: {State},
	name: String,
	statistics: [{
		fuelType: String,
		consumerPrice: [{
			averagePrice: Number,
			standardDeviation: Number,
			minPrice: Number,
			maxPrice: Number,
			averageMargin: Number
		}],
		distributionPrice: [{
			averagePrice: Number,
			standardDeviation: Number,
			minPrice: Number,
			maxPrice: Number,
		}],
	}],
	stations: [Stations],
	dates: {
		from: Date,
		to: Date,
	}
}
```

3. Stations

```
{
	city: {City},
	name: String,
	address: String,
	area: String,
	flag: String,
	prices: [{
		fuelType: String,
		sellPrice: Number,
		buyPrice: Number,
		saleMode: String,
		provider: Date,
		date: Date,
	}],
	dates: {
		from: Date,
		to: Date,
	}
}
```

## Libs used

## See also
[GasTruckCrawler](https://github.com/mibrito/gastruckcrawler.git) A crawler for GasTruck project
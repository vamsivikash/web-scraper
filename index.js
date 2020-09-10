const axios = require('axios');
const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const fs = require('fs');


const SEARCH_BOX = '#search-box-input';
const SEARCH_INPUT = '98005';
const SEARCH_BUTTON = '.SearchButton';

const FILTER_BUTTON = '.wideSidepaneFilterButton';
const MIN = '.minBeds';
const BASE_URL = "https://redfin.com";

function scrapeContent(scrapeData){
    fs.writeFile("output/test.txt", scrapeData, function(err){
        if(err)
            console.log("ERROR writing the file ", err)
        else
            console.log('Raw Data written to file');
    });

    const $ = cheerio.load(scrapeData);
    let houseList = $('div.homecards')[0].children;
    let houseDetailsList = [];

    houseList.forEach((house, index, array) => {
        if(index != array.length - 1){
            // item holds the information about each of the search listings - holds both the image + the price (.bottomv2)
            let item = cheerio.load(house.children[0].children); 
            let price = item('.bottomV2 > .homecardV2Price').text();
            let address = item('.bottomV2 > .homeAddressV2').text(); 
            let link = BASE_URL + item('.bottomV2 > a')[0].attribs.href;
            let details = {
                "price": price,
                "address": address, 
                "link": link
            };
            houseDetailsList.push(details);
        }
    });

    return new Promise((resolve, reject) => {
        resolve(houseDetailsList);
    });
}

function parseHomeFacts(homeDetails){
    // returns a map containing information about the house 

    const $ = cheerio.load(homeDetails);
    // keyDetailsList[0] = Holds information about "Price Insights"
    // keyDetailsList[1] = Holds information about "Home Facts"
    let completeFactsList = $('div.keyDetailsList')[1].children;
    let factMap = new Map(); 

    completeFactsList.forEach((fact) => {
        factMap.set($(fact.children[0]).text(), $(fact.children[1]).text());
    });

    let propertyDetails = $('div.desktop > .HomeInfo > .top-stats > .HomeMainStats');
    let baths = $(propertyDetails[0].children[2].children[0]).text();
    let sqft = $(propertyDetails[0].children[3].children[0]).text();
    
    factMap.set('baths', baths);
    factMap.set('sqft', sqft);

    //console.log(factMap);

    return new Promise((resolve, reject) => {
        resolve(factMap);
    });
}

function notification(scrapeData){
    console.log(scrapeData[0].get('Status'));



    return new Promise((resolve, reject) => {
        resolve("Hello");
    });
}

async function main(){
    let scrapeInfo =[];
    await puppeteer.launch({ headless: true })
        .then(async(browser) => {
            let page = await browser.newPage(); 
            page.setViewport({width: 1386, height: 768});
            await page.goto('https://www.redfin.com/zipcode/98005/filter/max-price=5M,min-beds=5,max-beds=5,min-baths=5', {waitUntil: 'domcontentloaded'});

            const content = await page.content();
            let housesInfoList = await scrapeContent(content);
            
            const scrapeInfo = await housesInfoList.map( async(house, index) => {
                let houseDetailsPage = await browser.newPage(); 
                await houseDetailsPage.goto(housesInfoList[index].link, {waitUntil: 'domcontentloaded'});
                const houseCont = await houseDetailsPage.content(); 
                let details = await parseHomeFacts(houseCont); 
                return details;  
            });
            await Promise.all(scrapeInfo).then(async(value) => {
                await notification(value);

            });

            setTimeout(async() => {
                await browser.close();
           }, 3000);

        });
}

main();

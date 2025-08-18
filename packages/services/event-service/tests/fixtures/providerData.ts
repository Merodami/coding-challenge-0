/**
 * Test fixtures for provider data
 * Using planList structure as per actual API
 */

export const validProviderXML = `
<?xml version="1.0" encoding="UTF-8"?>
<planList>
  <output>
    <base_plan base_plan_id="291" sell_mode="online" title="Mamma Mia" organizer_company_id="1">
      <plan plan_id="291">
        <plan_start_date>2021-06-15T17:00:00</plan_start_date>
        <plan_end_date>2021-06-15T20:00:00</plan_end_date>
        <zone zone_id="1" name="VIP" price="25.00" capacity="100" numbered="true"/>
        <zone zone_id="2" name="General" price="15.00" capacity="200" numbered="false"/>
      </plan>
    </base_plan>
    <base_plan base_plan_id="322" sell_mode="online" title="Concert at Central Park" organizer_company_id="2">
      <plan plan_id="322">
        <plan_start_date>2021-07-20T19:00:00</plan_start_date>
        <plan_end_date>2021-07-20T22:00:00</plan_end_date>
        <zone zone_id="3" name="Front Row" price="75.00" capacity="50" numbered="true"/>
        <zone zone_id="4" name="Standard" price="35.00" capacity="300" numbered="false"/>
      </plan>
    </base_plan>
  </output>
</planList>
`

export const emptyProviderXML = `
<?xml version="1.0" encoding="UTF-8"?>
<planList>
  <output>
  </output>
</planList>
`

export const invalidXML = `
<planList>
  <output>
    <base_plan base_plan_id="123"
      <plan plan_id="456">
        <title>Unclosed tag plan</title>
    </base_plan>
  </output>
</planList>
`

export const providerXMLWithOfflineEvents = `
<?xml version="1.0" encoding="UTF-8"?>
<planList>
  <output>
    <base_plan base_plan_id="100" sell_mode="offline" title="Offline Only Event">
      <plan plan_id="100">
        <plan_start_date>2021-08-15T18:00:00</plan_start_date>
        <plan_end_date>2021-08-15T21:00:00</plan_end_date>
      </plan>
    </base_plan>
    <base_plan base_plan_id="101" sell_mode="online" title="Online Event">
      <plan plan_id="101">
        <plan_start_date>2021-08-15T18:00:00</plan_start_date>
        <plan_end_date>2021-08-15T21:00:00</plan_end_date>
        <zone zone_id="5" name="General" price="20.00" capacity="100" numbered="false"/>
      </plan>
    </base_plan>
  </output>
</planList>
`

// Fast-xml-parser output structure with attributes directly on objects
// and configured arrays for base_plan, plan, and zone
export const parsedProviderData = {
  planList: {
    output: {
      base_plan: [
        {
          base_plan_id: '291',
          sell_mode: 'online',
          title: 'Mamma Mia',
          organizer_company_id: '1',
          plan: [
            {
              plan_id: '291',
              plan_start_date: '2021-06-15T17:00:00',
              plan_end_date: '2021-06-15T20:00:00',
              zone: [
                {
                  zone_id: '1',
                  name: 'VIP',
                  price: 25.0,
                  capacity: 100,
                  numbered: true,
                },
                {
                  zone_id: '2',
                  name: 'General',
                  price: 15.0,
                  capacity: 200,
                  numbered: false,
                },
              ],
            },
          ],
        },
        {
          base_plan_id: '322',
          sell_mode: 'online',
          title: 'Concert at Central Park',
          organizer_company_id: '2',
          plan: [
            {
              plan_id: '322',
              plan_start_date: '2021-07-20T19:00:00',
              plan_end_date: '2021-07-20T22:00:00',
              zone: [
                {
                  zone_id: '3',
                  name: 'Front Row',
                  price: 75.0,
                  capacity: 50,
                  numbered: true,
                },
                {
                  zone_id: '4',
                  name: 'Standard',
                  price: 35.0,
                  capacity: 300,
                  numbered: false,
                },
              ],
            },
          ],
        },
      ],
    },
  },
}

export const expectedDomainPlans = [
  {
    basePlanId: '291',
    title: 'Mamma Mia',
    organizerCompanyId: '1',
    sellMode: 'online',
    plans: [
      {
        planId: '291',
        planStartDate: new Date('2021-06-15T17:00:00'),
        planEndDate: new Date('2021-06-15T20:00:00'),
        minPrice: 15,
        maxPrice: 25,
        zones: [
          {
            zoneId: '1',
            name: 'VIP',
            capacity: 100,
            price: 25,
            numbered: true,
          },
          {
            zoneId: '2',
            name: 'General',
            capacity: 200,
            price: 15,
            numbered: false,
          },
        ],
      },
    ],
  },
  {
    basePlanId: '322',
    title: 'Concert at Central Park',
    organizerCompanyId: '2',
    sellMode: 'online',
    plans: [
      {
        planId: '322',
        planStartDate: new Date('2021-07-20T19:00:00'),
        planEndDate: new Date('2021-07-20T22:00:00'),
        minPrice: 35,
        maxPrice: 75,
        zones: [
          {
            zoneId: '3',
            name: 'Front Row',
            capacity: 50,
            price: 75,
            numbered: true,
          },
          {
            zoneId: '4',
            name: 'Standard',
            capacity: 300,
            price: 35,
            numbered: false,
          },
        ],
      },
    ],
  },
]

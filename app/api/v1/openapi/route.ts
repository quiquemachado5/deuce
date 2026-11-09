import { SITE_ORIGIN } from '@/lib/site-origin';

const specification={
  openapi:'3.1.0',
  info:{title:'DEUCE Read API',version:'1.2.0',description:'Read-only access to immutable ATP and WTA publication artifacts. This API never proxies upstream credentials or provider quota.'},
  servers:[{url:SITE_ORIGIN}],
  paths:{
    '/api/v1/archive':{get:{summary:'Active archive publication',responses:{'200':{description:'Dataset version, publication time and circuit coverage',content:{'application/json':{schema:{$ref:'#/components/schemas/Archive'}}}},'429':{$ref:'#/components/responses/RateLimited'}}}},
    '/api/v1/matches':{get:{summary:'Search documented matches',parameters:[
      {name:'tour',in:'query',schema:{type:'string',enum:['atp','wta','all'],default:'atp'}},
      {name:'year',in:'query',schema:{type:'integer',minimum:1968,maximum:2100}},
      {name:'player',in:'query',schema:{type:'string',maxLength:100}},
      {name:'tournament',in:'query',schema:{type:'string',maxLength:100}},
      {name:'category',in:'query',schema:{type:'string',maxLength:80}},
      {name:'surface',in:'query',schema:{type:'string',enum:['hard','clay','grass','carpet','unknown']}},
      {name:'round',in:'query',schema:{type:'string',maxLength:80}},
      {name:'q',in:'query',schema:{type:'string',maxLength:120}},
      {name:'page',in:'query',schema:{type:'integer',minimum:1,maximum:1000,default:1}},
      {name:'limit',in:'query',schema:{type:'integer',minimum:1,maximum:100,default:25}},
      {name:'format',in:'query',schema:{type:'string',enum:['json','csv'],default:'json'}},
    ],responses:{'200':{description:'A versioned page of documented matches. CSV is returned when format=csv.'},'400':{description:'Invalid query parameter'},'429':{$ref:'#/components/responses/RateLimited'}}}},
  },
  components:{schemas:{Archive:{type:'object',required:['api','version','dataset','derived'],properties:{api:{type:'string'},version:{type:'string'},dataset:{type:'object'},derived:{type:'object',properties:{elo:{type:'object',properties:{modelVersion:{type:['string','null']},method:{type:'string'},calibration:{type:['object','null']},surfaceCalibration:{type:['object','null']}}}}}}}},responses:{RateLimited:{description:'Per-client request budget exceeded',headers:{'Retry-After':{schema:{type:'integer'}}}}}},
};

export function GET(){return Response.json(specification,{headers:{'Cache-Control':'public, max-age=3600, s-maxage=86400','Access-Control-Allow-Origin':'*'}})}
export function OPTIONS(){return new Response(null,{status:204,headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET, OPTIONS','Access-Control-Allow-Headers':'Accept, If-None-Match'}})}

# Swagger Petstore

> Version 1.0.0


## Path Table

| Method | Path | Description |
| --- | --- | --- |
| GET | [/pets](#getpets) | List all pets |
| POST | [/pets](#postpets) | Create a pet |
| GET | [/pets/{petId}](#getpetspetid) | Info for a specific pet |

## Reference Table

| Name | Path | Description |
| --- | --- | --- |
| Pet | [#/components/schemas/Pet](#componentsschemaspet) |  |
| Pets | [#/components/schemas/Pets](#componentsschemaspets) |  |
| Error | [#/components/schemas/Error](#componentsschemaserror) |  |

## Path Details

***

### [GET]/pets

- Summary  
  List all pets

- Operation id  
  listPets

#### Parameters(Query)

```typescript
// How many items to return at one time (max 100)
limit?: integer //format: int32
```

#### Responses

- 200 A paged array of pets

`application/json`

```typescript
{
  id: integer //format: int64
  name: string
  tag?: string
}[]
```

- default unexpected error

`application/json`

```typescript
{
  code: integer //format: int32
  message: string
}
```

***

### [POST]/pets

- Summary  
  Create a pet

- Operation id  
  createPets

#### RequestBody

- application/json

```typescript
{
  id: integer //format: int64
  name: string
  tag?: string
}
```

#### Responses

- 201 Null response

- default unexpected error

`application/json`

```typescript
{
  code: integer //format: int32
  message: string
}
```

***

### [GET]/pets/{petId}

- Summary  
  Info for a specific pet

- Operation id  
  showPetById

#### Parameters(Path)

```typescript
// The id of the pet to retrieve
petId: string
```

#### Responses

- 200 Expected response to a valid request

`application/json`

```typescript
{
  id: integer //format: int64
  name: string
  tag?: string
}
```

- default unexpected error

`application/json`

```typescript
{
  code: integer //format: int32
  message: string
}
```

## References

### #/components/schemas/Pet

```typescript
{
  id: integer //format: int64
  name: string
  tag?: string
}
```

### #/components/schemas/Pets

```typescript
{
  id: integer //format: int64
  name: string
  tag?: string
}[]
```

### #/components/schemas/Error

```typescript
{
  code: integer //format: int32
  message: string
}
```
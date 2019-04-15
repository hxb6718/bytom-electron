import {
  BaseNew,
  FormSection,
  Autocomplete,
  ObjectSelectorField,
  TextField,
  AmountUnitField,
  AmountField,
  PasswordField,
  RadioField,
  KeyValueTable,
} from 'features/shared/components'
import { Connection } from 'sdk'
import {chainClient} from 'utility/environment'
import { addZeroToDecimalPosition } from 'utility/buildInOutDisplay'
import  TxContainer  from './NewTransactionsContainer/TxContainer'
import {reduxForm} from 'redux-form'
import React from 'react'
import styles from './New.scss'
import actions from 'actions'
import { btmID } from 'utility/environment'
import { getAssetDecimal} from '../../transactions'
import {withNamespaces} from 'react-i18next'


class IssueAssets extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      counter: 1,
    }

    this.submitWithValidation = this.submitWithValidation.bind(this)
    this.addReceiverItem = this.addReceiverItem.bind(this)
    this.removeReceiverItem = this.removeReceiverItem.bind(this)
  }

  submitWithValidation(data) {
    return new Promise((resolve, reject) => {
      this.props.submitForm(Object.assign({}, data, {state: this.state, form: 'issueAssetTx'}))
        .catch((err) => {
          const response = {}

          if (err.data) {
            response.actions = []
          }

          response['_error'] = err
          return reject(response)
        })
    })
  }

  addReceiverItem() {
    const counter = this.state.counter
    this.props.fields.receivers.addField({
      id: counter
    })
    this.setState({
      counter: counter+1,
    })
  }

  removeReceiverItem(index) {
    this.props.fields.receivers.removeField(index)
  }

  decodeRawTx(e){
    try {
      const rawTransaction = Connection.camelize(JSON.parse(e.target.value)).rawTransaction
      this.props.decode(rawTransaction)
    } catch (e) {
    }
  }

  componentWillReceiveProps(nextProps) {
    if(nextProps.decodedTx.length !== 0 && nextProps.decodedTx !== this.props.decodedTx && nextProps.fields.submitAction.value === 'sign'){
      const transaction = nextProps.decodedTx

      const inputs = transaction.inputs
      const outputs = transaction.outputs

      const issueAction = inputs.filter(input => input.type === 'issue')[0]
      const issueAssetId = issueAction.assetId

      const issueReceivers = outputs.filter(output => output.assetId == issueAssetId)

      const diffLength = issueReceivers.length - this.props.fields.receivers.length

      if(diffLength > 0 ){
        const counter = this.state.counter
        for (let i = 0; i < diffLength; i++) {
          this.props.fields.receivers.addField({
            id: counter+i
          })
        }
        this.setState({
          counter: counter+diffLength,
        })
      }else if(diffLength < 0){
        for (let i = 0; i < -diffLength; i++) {
          this.removeReceiverItem(i)
        }
      }
    }

    else if( nextProps.fields.submitAction.value === 'submit' && this.props.fields.submitAction.value === 'sign'){
      const length = nextProps.fields.receivers.length
      if(length>1){
        for (let i = 0; i < (length-1) ; i++) {
          nextProps.fields.receivers.removeField(i)
        }
      }
    }

  }

  render() {
    const {
      fields: {assetAlias, assetId, receivers, password, submitAction, signTransaction, accountId, accountAlias, gas},
      error,
      handleSubmit,
      submitting
    } = this.props
    const t = this.props.t

    let submitLabel = t('transaction.new.submit')
    if (submitAction.value == 'sign') {
      submitLabel = 'sign tx'
    }

    const options = [
      {label: t('transaction.advance.submitToBlockchain') , value: 'submit'},
      {label: 'sign raw transaction', value: 'sign'}
    ]

    const showBtmAmountUnit = (assetAlias.value === 'BTM' || assetId.value === btmID)
    const assetDecimal = getAssetDecimal(this.props.fields, this.props.asset) || 0

    const asset = this.props.asset.filter(a => (a.id === assetId.value || a.alias === assetAlias.value))[0]

    let assetItem

    if (submitAction.value === 'sign' && this.props.decodedTx.length !== 0 && signTransaction.value && signTransaction.valid) {
      const transaction = this.props.decodedTx

      const inputs = transaction.inputs
      const outputs = transaction.outputs

      const issueAction = inputs.filter(input => input.type === 'issue')[0]
      const issueAssetId = issueAction.assetId
      assetId.value = issueAssetId

      gas.value = transaction.fee / Math.pow(10, 8) + ' BTM'

      accountAlias.value = inputs.filter(input => input.type === 'spend')[0].address

      const assetDefinition = issueAction.assetDefinition

      assetItem = <KeyValueTable
        title={'Definition'}
        id={issueAssetId}
        object='asset'
        items={[
          {label: 'ID', value: issueAssetId},
          {label: t('form.alias'), value: assetDefinition.name},
          {label: t('form.symbol'), value: assetDefinition.symbol},
          {label: t('form.decimals'), value: assetDefinition.decimals},
          {label: t('form.reissueTitle'), value: assetDefinition.reissue || 'true'},
          {label: t('form.quorum'), value: assetDefinition.quorum},
          {label: t('asset.additionInfo'), value: assetDefinition.description},
        ]}
      />

      const issueReceivers = outputs.filter(output => output.assetId == issueAssetId)

      receivers.map((receiver, index) =>{
        if(issueReceivers[index]){
          receiver.address.value = issueReceivers[index].address
          receiver.amount.value = addZeroToDecimalPosition((issueReceivers[index].amount/Math.pow(10, assetDefinition.decimals)), Number(assetDefinition.decimals))
        }
      })

    } else if (asset) {
      assetItem = <KeyValueTable
        title={'definition'}
        id={asset.id}
        object='asset'
        items={[
          {label: 'ID', value: asset.id},
          {label: t('form.alias'), value: asset.alias},
          {label: t('form.symbol'), value: asset.definition.symbol},
          {label: t('form.decimals'), value: asset.definition.decimals},
          {label: t('form.reissueTitle'), value: (asset.alias === 'BTM' || asset.limitHeight > 0) ? 'false' : 'true'},
          {label: t('form.xpubs'), value: (asset.xpubs || []).length},
          {label: t('form.quorum'), value: asset.quorum},
          {label: t('asset.additionInfo'), value: asset.definition.description},
        ]}
      />
    }

    return (
      <TxContainer
        error={error}
        onSubmit={handleSubmit(this.submitWithValidation)}
        submitting={submitting}
        submitLabel= {submitLabel}
        className={styles.container}
      >

        <FormSection  title= { 'Issue asset'}>
          {assetItem}
          <label className={styles.title}>Input</label>
          <div className={`${styles.mainBox} ${this.props.tutorialVisible? styles.tutorialItem: styles.item}`}>
            {
              submitAction.value === 'sign'?
                <TextField title={'Account address'}
                           disabled = {true}
                           fieldProps={accountAlias}/>
                :
                <ObjectSelectorField
                  key='account-selector-field'
                  keyIndex='normaltx-account'
                  title={t('form.account')}
                  aliasField={Autocomplete.AccountAlias}
                  fieldProps={{
                    id: accountId,
                    alias: accountAlias
                  }}
                />
            }

            {
              submitAction.value === 'submit' && <ObjectSelectorField
                key='asset-selector-field'
                keyIndex='normaltx-asset'
                title={ t('form.asset')}
                aliasField={Autocomplete.AssetAlias}
                fieldProps={{
                  id: assetId,
                  alias: assetAlias
                }}
              />
            }
          </div>
          <label className={styles.title}>Output</label>
          <div className={styles.mainBox}>
            {receivers.map((receiver, index) =>
              <div
                className={this.props.tutorialVisible? styles.tutorialItem: styles.subjectField}
                key={`issueAsset-${receiver.id.value}`}>
                <TextField title={t('form.address')}
                           disabled = {submitAction.value === 'sign'}
                           fieldProps={{
                             ...receiver.address,
                             onBlur: (e) => {
                               receiver.address.onBlur(e)
                             },
                           }}/>

                {
                  submitAction.value === 'sign'?
                    <TextField
                      title={t('form.amount')}
                      disabled = {true}
                      fieldProps={receiver.amount}
                    />:
                    <AmountField
                      isBTM={showBtmAmountUnit}
                      title={t('form.amount')}
                      fieldProps={receiver.amount}
                      decimal={assetDecimal}
                    />
                }

                <button
                  className={`btn btn-danger btn-xs ${styles.deleteButton}`}
                  tabIndex='-1'
                  type='button'
                  disabled = {submitAction.value === 'sign'}
                  onClick={() => this.removeReceiverItem(index)}
                >
                  {t('commonWords.remove')}
                </button>
              </div>
            )}
            <button
              type='button'
              className='btn btn-default'
              disabled = {submitAction.value === 'sign'}
              onClick={this.addReceiverItem}
            >
              {t('commonWords.addField')}
            </button>
          </div>
        </FormSection>
        <FormSection  title= { 'Gas'}>

            {
              submitAction.value === 'sign'?
                  <TextField title={'gas'}
                           disabled = {true}
                           fieldProps={gas}/>
                // </div>
                :
                // <div className={styles.item}>
                //   <ObjectSelectorField
                //     key='account-selector-field'
                //     keyIndex='normaltx-account'
                //     title={t('form.account')}
                //     aliasField={Autocomplete.AccountAlias}
                //     fieldProps={{
                //       id: accountId,
                //       alias: accountAlias
                //     }}
                //   />
                <AmountUnitField title={'gas'} fieldProps={gas}/>
              // </div>
            }

        </FormSection>

        <FormSection  title= { 'transaction'}>
          <RadioField title={t('transaction.advance.buildType')} options={options} fieldProps={{
            ...submitAction,
            // onChange: submitactionOnChange,
          }} />
          {
            submitAction.value === 'sign' &&
            <TextField
              title={t('transaction.advance.toSignTransaction')}
              fieldProps={{
                ...signTransaction,
                onBlur: (e) => {
                  signTransaction.onBlur(e)
                  this.decodeRawTx(e)
                },
              }}
            />
          }
        </FormSection>

        <FormSection  title={ t('key.password') }>
          <PasswordField
            // title={t('key.password')}
            placeholder={t('key.passwordPlaceholder')}
            fieldProps={password}
          />
        </FormSection>
      </TxContainer>

    )
  }
}

const validate = (values, props) => {
  const errors = {}
  const t = props.t

  // Base transaction
  let baseTx = (values.signTransaction || '').trim()
  try {
    JSON.parse(baseTx)
  } catch (e) {
    if (baseTx && e) {
      errors.signTransaction = t('errorMessage.jsonError')
    }
  }

  return errors
}

const asyncValidate = (values, dispatch, props) => {
  const errors = []
  const promises = []

  values.receivers.forEach((receiver, idx) => {
    const address = values.receivers[idx].address
    if ( !address || address.length === 0)
      promises.push(Promise.resolve())
    else{
      promises.push(
        chainClient().accounts.validateAddresses(address)
          .then(
            (resp) => {
              if (!resp.data.valid) {
                errors[idx] = {address: props.t('errorMessage.addressError')}
              }
              return {}
            }
          ))
    }
  })

  return Promise.all(promises).then(() => {
    if (errors.length > 0) throw {
      receivers: errors
    }
    return {}
  })
}

const mapDispatchToProps = (dispatch) => ({
  ...BaseNew.mapDispatchToProps('transaction')(dispatch),
  decode: (transaction) => dispatch( actions.transaction.decode(transaction)),
})

const mapStateToProps = (state, ownProps) => ({
  ...BaseNew.mapStateToProps('transaction')(state, ownProps),
  decodedTx: state.transaction.decodedTx,
  initialValues:{
    assetAlias: ownProps.location.query.alias,
    submitAction: 'submit',
    receivers:[{
      id: 0,
      amount:'',
      address:''
    }]
  }
})

export default withNamespaces('translations') (BaseNew.connect(
  mapStateToProps,
  mapDispatchToProps,
  reduxForm({
    form: 'IssueAssetTxForm',
    fields: [
      'assetAlias',
      'assetId',
      'receivers[].id',
      'receivers[].amount',
      'receivers[].address',
      'password',
      'submitAction',
      'signTransaction',
      'accountAlias',
      'accountId',
      'gas'
    ],
    asyncValidate,
    asyncBlurFields: ['receivers[].address'],
    validate,
    touchOnChange: true,
  }
  )(IssueAssets)
))

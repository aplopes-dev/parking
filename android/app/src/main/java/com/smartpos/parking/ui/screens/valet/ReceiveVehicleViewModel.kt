package com.smartpos.parking.ui.screens.valet

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.smartpos.parking.data.repository.ParkingRepository
import com.smartpos.parking.domain.model.VehicleType
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class ReceiveVehicleUiState(
    val plate: String = "",
    val vehicleType: VehicleType = VehicleType.CAR,
    val customerName: String = "",
    val customerPhone: String = "",
    val keyTag: String = "",
    val notes: String = "",
    val loading: Boolean = false,
    val success: Boolean = false,
    val error: String? = null
)

class ReceiveVehicleViewModel(
    private val repository: ParkingRepository
) : ViewModel() {

    private val _ui = MutableStateFlow(ReceiveVehicleUiState())
    val uiState: StateFlow<ReceiveVehicleUiState> = _ui.asStateFlow()

    fun setPlate(value: String) = _ui.update { it.copy(plate = value.uppercase()) }
    fun setVehicleType(type: VehicleType) = _ui.update { it.copy(vehicleType = type) }
    fun setCustomerName(value: String) = _ui.update { it.copy(customerName = value) }
    fun setCustomerPhone(value: String) = _ui.update { it.copy(customerPhone = value) }
    fun setKeyTag(value: String) = _ui.update { it.copy(keyTag = value) }
    fun setNotes(value: String) = _ui.update { it.copy(notes = value) }

    fun submit() {
        val plate = _ui.value.plate.trim()
        if (plate.length < 5) {
            _ui.update { it.copy(error = "Informe uma placa válida") }
            return
        }
        viewModelScope.launch {
            _ui.update { it.copy(loading = true, error = null) }
            repository.receiveVehicle(
                plate = plate,
                vehicleType = _ui.value.vehicleType,
                customerName = _ui.value.customerName,
                customerPhone = _ui.value.customerPhone,
                keyTag = _ui.value.keyTag,
                notes = _ui.value.notes
            ).onSuccess {
                _ui.update { it.copy(loading = false, success = true) }
            }.onFailure { e ->
                _ui.update { it.copy(loading = false, error = e.message) }
            }
        }
    }

    companion object {
        fun factory(repository: ParkingRepository) = object : ViewModelProvider.Factory {
            @Suppress("UNCHECKED_CAST")
            override fun <T : ViewModel> create(modelClass: Class<T>): T =
                ReceiveVehicleViewModel(repository) as T
        }
    }
}

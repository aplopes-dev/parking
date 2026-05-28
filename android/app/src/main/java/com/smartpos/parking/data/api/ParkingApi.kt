package com.smartpos.parking.data.api

import com.smartpos.parking.data.api.dto.AssignValetRequestDto
import com.smartpos.parking.data.api.dto.CreateValetTicketRequestDto
import com.smartpos.parking.data.api.dto.DeliverValetRequestDto
import com.smartpos.parking.data.api.dto.LoginRequestDto
import com.smartpos.parking.data.api.dto.LoginResponseDto
import com.smartpos.parking.data.api.dto.ParkVehicleRequestDto
import com.smartpos.parking.data.api.dto.ParkingBootstrapDto
import com.smartpos.parking.data.api.dto.UserDto
import com.smartpos.parking.data.api.dto.ValetQuoteDto
import com.smartpos.parking.data.api.dto.ValetTicketDto
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query

interface AuthApi {
    @POST("auth/login")
    suspend fun login(@Body body: LoginRequestDto): LoginResponseDto

    @GET("auth/me")
    suspend fun me(): UserDto
}

interface MobileParkingApi {
    @GET("mobile/parking/bootstrap")
    suspend fun bootstrap(@Query("facilityId") facilityId: String? = null): ParkingBootstrapDto

    @GET("mobile/parking/tickets")
    suspend fun listTickets(
        @Query("facilityId") facilityId: String? = null,
        @Query("queue") queue: String? = null
    ): List<ValetTicketDto>

    @GET("mobile/parking/tickets/{ticketId}/quote")
    suspend fun quoteTicket(
        @Path("ticketId") ticketId: String,
        @Query("tariffId") tariffId: String? = null
    ): ValetQuoteDto

    @POST("mobile/parking/tickets")
    suspend fun receiveVehicle(@Body body: CreateValetTicketRequestDto): ValetTicketDto

    @POST("mobile/parking/tickets/{ticketId}/park/start")
    suspend fun startParking(
        @Path("ticketId") ticketId: String,
        @Body body: AssignValetRequestDto
    ): ValetTicketDto

    @POST("mobile/parking/tickets/{ticketId}/park/complete")
    suspend fun completeParking(
        @Path("ticketId") ticketId: String,
        @Body body: ParkVehicleRequestDto
    ): ValetTicketDto

    @POST("mobile/parking/tickets/{ticketId}/request")
    suspend fun requestRetrieval(@Path("ticketId") ticketId: String): ValetTicketDto

    @POST("mobile/parking/tickets/{ticketId}/retrieve/start")
    suspend fun startRetrieval(
        @Path("ticketId") ticketId: String,
        @Body body: AssignValetRequestDto
    ): ValetTicketDto

    @POST("mobile/parking/tickets/{ticketId}/ready")
    suspend fun markReady(@Path("ticketId") ticketId: String): ValetTicketDto

    @POST("mobile/parking/tickets/{ticketId}/deliver")
    suspend fun deliver(
        @Path("ticketId") ticketId: String,
        @Body body: DeliverValetRequestDto
    ): ValetTicketDto

    @POST("mobile/parking/tickets/{ticketId}/cancel")
    suspend fun cancel(@Path("ticketId") ticketId: String): ValetTicketDto
}
